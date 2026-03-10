"use client";

import { useRef } from "react";
import { useParticleAnimation } from "@/hooks/useParticleAnimation";

interface ParticleTextProps {
  imageSrc: string;
  className?: string;
}

export default function ParticleText({ imageSrc, className }: ParticleTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useParticleAnimation(imageSrc, containerRef);

  return (
    <div
      ref={containerRef}
      className={`w-full h-[400px] ${className || ""}`}
      aria-hidden="true"
    />
  );
}
