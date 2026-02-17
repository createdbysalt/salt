"use client";

import { cn } from "@repo/utils";
import { useAnimationTier } from "@/app/_lib/animations/hooks";

interface GridPatternProps {
  className?: string;
  /** Dot size in pixels. Default: 1 */
  dotSize?: number;
  /** Gap between dots in pixels. Default: 24 */
  gap?: number;
  /** Dot color. Default: "rgba(255,255,255,0.15)" */
  dotColor?: string;
}

/**
 * Subtle dot grid background pattern.
 * Inspired by Linear/Vercel's grid overlays.
 * Only renders on desktop (tier === "full") to save mobile GPU.
 */
export function GridPattern({
  className,
  dotSize = 1,
  gap = 24,
  dotColor = "rgba(255,255,255,0.15)",
}: GridPatternProps) {
  const tier = useAnimationTier();

  // Skip on mobile and reduced-motion
  if (tier !== "full") return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0",
        className
      )}
      aria-hidden="true"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${gap}px ${gap}px`,
      }}
    />
  );
}
