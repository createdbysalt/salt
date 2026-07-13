"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

type Props = {
  level: number;
  isPaused: boolean;
  isActive: boolean;
  size?: "sm" | "md";
};

export function BriefingVoiceOrb({
  level,
  isPaused,
  isActive,
  size = "sm",
}: Props) {
  const speaking = isActive && !isPaused;
  const energy = speaking ? Math.max(0.18, level) : 0.08;
  const pulse = 1 + energy * 0.42;
  const dimensions = size === "sm" ? "size-12" : "size-20";
  const core = size === "sm" ? "size-10" : "size-16";

  return (
    <div
      className={cn("relative shrink-0 grid place-items-center", dimensions)}
      aria-hidden
    >
      <motion.span
        className="absolute inset-0 rounded-full surface-aurora opacity-30 blur-lg"
        animate={{
          scale: speaking ? pulse * 1.45 : 1.15,
          opacity: speaking ? 0.2 + energy * 0.45 : 0.15,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 16 }}
      />
      <motion.span
        className={cn("relative rounded-full surface-aurora", core)}
        animate={{
          scale: speaking ? pulse : [1, 1.05, 1],
        }}
        transition={
          speaking
            ? { type: "spring", stiffness: 420, damping: 14 }
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          boxShadow: speaking
            ? `0 0 ${12 + energy * 40}px color-mix(in oklab, var(--flame) 55%, transparent)`
            : "0 0 12px color-mix(in oklab, var(--flame) 25%, transparent)",
        }}
      />
    </div>
  );
}
