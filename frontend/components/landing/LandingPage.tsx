'use client';

import { useState, useEffect } from 'react';
import AnimatedSphere from './AnimatedSphere';
import Link from 'next/link';

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  // Use state to prevent hydration mismatch - stars generated only on client
  const [stars, setStars] = useState<Array<{
    top: string;
    left: string;
    animationDelay: string;
    animationDuration: string;
    opacity: number;
  }>>([]);

  useEffect(() => {
    // Generate stars only on client side after mount
    setStars(
      Array.from({ length: 100 }, (_, i) => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 3}s`,
        opacity: Math.random() * 0.7 + 0.3,
      }))
    );
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/20 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
      </div>

      {/* Stars - only render after client-side mount */}
      <div className="absolute inset-0">
        {stars.map((style, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={style}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left Side - Content */}
          <div className="space-y-8 animate-fadeIn">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎤</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                IntelliML
              </span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                  AI-Powered AutoML
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  for Everyone
                </span>
              </h1>

              <p className="text-xl text-gray-300 max-w-xl leading-relaxed">
                Voice-controlled machine learning platform with autonomous model training, 
                real-time insights, and AI-powered explanations. Operational in less than 1 minute. 
                No code changes needed.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard
                icon="🎤"
                title="Voice Control"
                description="Control everything with natural speech"
              />
              <FeatureCard
                icon="🤖"
                title="AutoML"
                description="Automatic model selection & training"
              />
              <FeatureCard
                icon="📊"
                title="Live Dashboard"
                description="Real-time data visualization"
              />
              <FeatureCard
                icon="✨"
                title="AI Insights"
                description="Intelligent explanations at every step"
              />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={onGetStarted}
                className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
              >
                <span className="flex items-center space-x-2">
                  <span>Get Started</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>

              <button className="px-8 py-4 border-2 border-purple-500/30 rounded-lg font-semibold text-lg hover:border-purple-500 hover:bg-purple-500/10 transition-all duration-300">
                <span className="flex items-center space-x-2">
                  <span>📹</span>
                  <span>Watch Demo</span>
                </span>
              </button>

              <button className="px-8 py-4 border-2 border-blue-500/30 rounded-lg font-semibold text-lg hover:border-blue-500 hover:bg-blue-500/10 transition-all duration-300">
                <span className="flex items-center space-x-2">
                  <span>📚</span>
                  <span>Documentation</span>
                </span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-8 pt-8 border-t border-gray-800">
              <Stat value="<1 min" label="Setup Time" />
              <Stat value="6+" label="Model Types" />
              <Stat value="100%" label="Voice Controlled" />
            </div>
          </div>

          {/* Right Side - Animated Sphere */}
          <div className="relative h-[600px] lg:h-[700px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-full h-full">
              <AnimatedSphere />
            </div>

            {/* Floating Labels */}
            <FloatingLabel
              text="Voice Activated"
              top="10%"
              left="5%"
              delay="0s"
            />
            <FloatingLabel
              text="Real-time Analysis"
              top="30%"
              right="10%"
              delay="0.5s"
            />
            <FloatingLabel
              text="AutoML Engine"
              bottom="30%"
              left="0%"
              delay="1s"
            />
            <FloatingLabel
              text="AI Explanations"
              bottom="15%"
              right="5%"
              delay="1.5s"
            />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="flex flex-col items-center space-y-2 text-gray-400">
          <span className="text-sm">Scroll to explore</span>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="group p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function Stat({ value, label }: any) {
  return (
    <div>
      <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function FloatingLabel({ text, top, bottom, left, right, delay }: any) {
  return (
    <div
      className="absolute px-4 py-2 bg-purple-600/20 backdrop-blur-sm border border-purple-500/30 rounded-full text-sm font-medium animate-float"
      style={{
        top,
        bottom,
        left,
        right,
        animationDelay: delay,
      }}
    >
      {text}
    </div>
  );
}