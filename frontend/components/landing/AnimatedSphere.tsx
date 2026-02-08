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
    const radius = Math.min(canvas.width, canvas.height) * 0.35;
    let rotation = 0;

    class Particle {
      theta: number;
      phi: number;
      x: number = 0;
      y: number = 0;
      z: number = 0;
      projected2D = { x: 0, y: 0 };

      constructor() {
        // Distribute particles evenly on sphere using Fibonacci sphere
        const i = particles.length;
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
          x: this.x * scale + canvas.width / 2,
          y: this.y * scale + canvas.height / 2,
        };
      }

      draw() {
        if (!ctx) return;

        // Color based on z-position (depth)
        const depth = (this.z + radius) / (2 * radius);
        const hue = 240 + depth * 60; // Blue to purple gradient
        const opacity = 0.3 + depth * 0.7;
        const size = 1 + depth * 2;

        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.projected2D.x, this.projected2D.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    let animationFrame: number;
    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update rotation
      rotation += 0.003;

      // Sort particles by z-index (back to front)
      particles.sort((a, b) => a.z - b.z);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      // Draw connections between nearby particles
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
          const dx = particles[i].projected2D.x - particles[j].projected2D.x;
          const dy = particles[i].projected2D.y - particles[j].projected2D.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 50) {
            ctx.beginPath();
            ctx.moveTo(particles[i].projected2D.x, particles[i].projected2D.y);
            ctx.lineTo(particles[j].projected2D.x, particles[j].projected2D.y);
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