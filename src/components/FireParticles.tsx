"use client";

import { useMemo } from "react";

interface Particle {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  opacity: number;
}

function generateParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 4 + 2,
      duration: `${Math.random() * 8 + 6}s`,
      delay: `${Math.random() * 10}s`,
      opacity: Math.random() * 0.4 + 0.2,
    });
  }
  return particles;
}

export function FireParticles({ count = 18 }: { count?: number }) {
  const particles = useMemo(() => generateParticles(count), [count]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="fire-particle absolute rounded-full"
          style={{
            left: p.left,
            bottom: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `radial-gradient(circle, #fb923c ${0}%, #f97316 ${50}%, transparent ${100}%)`,
            opacity: p.opacity,
            animationDuration: p.duration,
            animationDelay: p.delay,
            boxShadow: `0 0 ${p.size * 2}px ${p.size}px rgba(249,115,22,0.15)`,
          }}
        />
      ))}
    </div>
  );
}
