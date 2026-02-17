"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";
import { useAnimationTier } from "@/app/_lib/animations/hooks";

interface GlowBorderProps {
  children: React.ReactNode;
  className?: string;
  /** Duration of full rotation in seconds. Default: 3 */
  duration?: number;
  /** Border radius class. Default: "rounded-full" */
  rounded?: string;
}

/**
 * Animated conic-gradient rotating border glow.
 * Extracted from Raycast's announcement banner (3s rotation, linear, infinite).
 * Creates a premium "scanning light" effect around the element.
 */
export function GlowBorder({
  children,
  className,
  duration = 3,
  rounded = "rounded-full",
}: GlowBorderProps) {
  const tier = useAnimationTier();

  if (tier === "none") {
    return (
      <div
        className={cn(
          "relative p-px",
          rounded,
          "bg-white/[0.12]",
          className
        )}
      >
        <div
          className={cn(
            "relative bg-[rgb(8,9,10)]",
            rounded
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden p-px",
        rounded,
        className
      )}
    >
      <motion.div
        className="absolute inset-[-100%]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.3) 33%, transparent 50%, rgba(255,255,255,0.15) 83%, transparent 100%)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
        aria-hidden="true"
      />
      <div className={cn("relative bg-[rgb(8,9,10)]", rounded)}>
        {children}
      </div>
    </div>
  );
}
