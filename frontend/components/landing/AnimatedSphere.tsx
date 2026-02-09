'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Sphere parameters
    const particles: Particle[] = [];
    const particleCount = 2000;

    // Captured variables to avoid null checks in loop
    let width = canvas.width;
    let height = canvas.height;
    let radius = Math.min(width, height) * 0.35;
    let rotation = 0;

    class Particle {
      theta: number;
      phi: number;
      x: number = 0;
      y: number = 0;
      z: number = 0;
      projected2D = { x: 0, y: 0 };

      constructor(i: number) {
        // Distribute particles evenly on sphere using Fibonacci sphere
        this.phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
        this.theta = Math.PI * (1 + Math.sqrt(5)) * i;
        this.update();
      }

      update() {
        // 3D position on sphere
        this.x = radius * Math.sin(this.phi) * Math.cos(this.theta + rotation);
        this.y = radius * Math.sin(this.phi) * Math.sin(this.theta + rotation);
        this.z = radius * Math.cos(this.phi);

        // Project to 2D
        const scale = 400 / (400 + this.z);
        this.projected2D = {
          x: this.x * scale + width / 2,
          y: this.y * scale + height / 2,
        };
      }

      draw() {
        if (!ctx) return;

        // Color based on z-position (depth)
        const depth = (this.z + radius) / (2 * radius);
        // Gold (35) to Red (10) gradient
        const hue = 35 - depth * 25;
        const opacity = 0.3 + depth * 0.7;
        const size = 1 + depth * 2;

        ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.projected2D.x, this.projected2D.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(i));
    }

    // Animation loop
    let animationFrame: number;
    const animate = () => {
      if (!ctx || !canvas) return;

      // Update dimensions in case of resize (though we have listener, good to be safe)
      width = canvas.width;
      height = canvas.height;
      radius = Math.min(width, height) * 0.35;

      // Clear canvas with fade effect - Cream
      ctx.fillStyle = 'rgba(255, 247, 234, 0.2)'; // Cream with opacity for trails
      ctx.fillRect(0, 0, width, height);

      // Update rotation
      rotation += 0.002;

      // Sort particles by z-index (back to front)
      particles.sort((a, b) => a.z - b.z);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      // Draw connections between nearby particles
      // Sunray/Gold connection lines
      ctx.strokeStyle = 'rgba(254, 178, 41, 0.15)'; // Sunray low opacity
      ctx.lineWidth = 0.5;

      // Only connect a subset to save performance
      for (let i = 0; i < particles.length; i += 2) {
        const p1 = particles[i];
        // Check only next few particles
        for (let j = i + 1; j < Math.min(i + 4, particles.length); j++) {
          const p2 = particles[j];
          const dx = p1.projected2D.x - p2.projected2D.x;
          const dy = p1.projected2D.y - p2.projected2D.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 2500) { // distance < 50
            ctx.beginPath();
            ctx.moveTo(p1.projected2D.x, p1.projected2D.y);
            ctx.lineTo(p2.projected2D.x, p2.projected2D.y);
            ctx.stroke();
          }
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
}