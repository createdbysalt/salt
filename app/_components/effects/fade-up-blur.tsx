"use client";

import { motion } from "framer-motion";
import { useAnimationTier } from "@/app/_lib/animations/hooks";
import {
  fadeUpBlurVariants,
  fadeUpVariants,
} from "@/app/_lib/animations/variants";

interface FadeUpBlurProps {
  children: React.ReactNode;
  className?: string;
  /** Delay before animation starts (seconds). */
  delay?: number;
  /** Whether to trigger only once when entering viewport. Default: true */
  once?: boolean;
  /** How much of the element must be visible to trigger (0-1). Default: 0.2 */
  amount?: number;
}

/**
 * Viewport-triggered fade + translateY + blur entrance.
 * Automatically degrades: full → minimal (no blur) → none (instant).
 */
export function FadeUpBlur({
  children,
  className,
  delay = 0,
  once = true,
  amount = 0.2,
}: FadeUpBlurProps) {
  const tier = useAnimationTier();

  if (tier === "none") {
    return <div className={className}>{children}</div>;
  }

  const variants = tier === "full" ? fadeUpBlurVariants : fadeUpVariants;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
