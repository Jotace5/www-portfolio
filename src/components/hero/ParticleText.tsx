"use client";

import { useRef } from "react";
import { useParticleAnimation } from "@/hooks/useParticleAnimation";
import { ParticleTextConfig } from "@/lib/particleUtils";

interface ParticleTextProps {
  config: ParticleTextConfig;
  className?: string;
}

export default function ParticleText({ config, className }: ParticleTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useParticleAnimation(config, containerRef);

  return (
    <div
      ref={containerRef}
      className={`w-full h-137.5 ${className || ""}`}
      aria-hidden="true"
    />
  );
}
