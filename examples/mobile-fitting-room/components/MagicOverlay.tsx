"use client";

import { useMemo } from "react";

const COLORS = ["#ffffff", "#ffd964", "#b49aff", "#82c8ff", "#ffb4dc"];

type ParticleType = "star" | "orb" | "bigStar" | "ring";

interface SparkleData {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  type: ParticleType;
  animation: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSparkles(): SparkleData[] {
  const particles: SparkleData[] = [];

  for (let i = 0; i < 25; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 10 + Math.random() * 18,
      color: pick(COLORS),
      delay: Math.random() * 8,
      duration: 3.5 + Math.random() * 4,
      type: "star",
      animation: pick(["animate-sparkle-float", "animate-sparkle-drift"]),
    });
  }

  for (let i = 25; i < 31; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 28 + Math.random() * 24,
      color: pick(COLORS),
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 3,
      type: "bigStar",
      animation: "animate-sparkle-spin",
    });
  }

  for (let i = 31; i < 40; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 40 + Math.random() * 60,
      color: pick(COLORS),
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 4,
      type: "orb",
      animation: "animate-sparkle-pulse",
    });
  }

  for (let i = 40; i < 45; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 18 + Math.random() * 24,
      color: pick(COLORS),
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 3,
      type: "ring",
      animation: "animate-sparkle-ring",
    });
  }

  return particles;
}

function StarSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 0 L13.5 9.5 L24 12 L13.5 14.5 L12 24 L10.5 14.5 L0 12 L10.5 9.5 Z"
        fill={color}
      />
    </svg>
  );
}

function BigStarSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 0 L27 18 L48 24 L27 30 L24 48 L21 30 L0 24 L21 18 Z"
        fill={color}
        opacity="0.7"
      />
      <path
        d="M24 8 L26 20 L40 24 L26 28 L24 40 L22 28 L8 24 L22 20 Z"
        fill="white"
        opacity="0.4"
      />
    </svg>
  );
}

function renderParticle(s: SparkleData) {
  switch (s.type) {
    case "star":
      return <StarSVG size={s.size} color={s.color} />;
    case "bigStar":
      return <BigStarSVG size={s.size} color={s.color} />;
    case "orb":
      return (
        <div
          className="rounded-full"
          style={{
            width: s.size,
            height: s.size,
            background: `radial-gradient(circle, ${s.color}55 0%, ${s.color}22 40%, transparent 70%)`,
          }}
        />
      );
    case "ring":
      return (
        <div
          className="rounded-full"
          style={{
            width: s.size,
            height: s.size,
            border: `1.5px solid ${s.color}66`,
            boxShadow: `0 0 ${s.size * 0.3}px ${s.color}44`,
          }}
        />
      );
  }
}

export default function MagicOverlay({ visible }: { visible: boolean }) {
  const sparkles = useMemo(() => generateSparkles(), []);

  return (
    <div
      className={`absolute inset-0 z-[5] pointer-events-none overflow-hidden transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(90,50,180,0.1) 75%, rgba(50,20,140,0.18) 100%)",
        }}
      />
      {sparkles.map((s) => (
        <div
          key={s.id}
          className={`absolute ${s.animation}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            filter: `drop-shadow(0 0 ${s.size * 0.5}px ${s.color})`,
          }}
        >
          {renderParticle(s)}
        </div>
      ))}
    </div>
  );
}
