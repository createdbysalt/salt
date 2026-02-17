"use client";

import { motion } from "framer-motion";
import { useAnimationTier } from "@/app/_lib/animations/hooks";
import {
  staggerGridContainerVariants,
  staggerCardVariants,
} from "@/app/_lib/animations/variants";

interface StaggeredGridProps {
  children: React.ReactNode;
  className?: string;
  /** Trigger only once. Default: true */
  once?: boolean;
}

/**
 * Container that staggers its children's entrance (80ms gap, easeOutCubic).
 * Extracted from Raycast's extension card grid pattern.
 * Wrap your grid items in `<StaggeredGridItem>`.
 */
export function StaggeredGrid({
  children,
  className,
  once = true,
}: StaggeredGridProps) {
  const tier = useAnimationTier();

  if (tier === "none") {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerGridContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

interface StaggeredGridItemProps {
  children: React.ReactNode;
  className?: string;
  /** Enable hover lift on desktop. Default: true */
  hoverLift?: boolean;
}

/**
 * Individual item in a StaggeredGrid.
 * Animates: opacity 0→1, y 50→0, scale 0.98→1.
 * Optional hover lift (-4px) on desktop.
 */
export function StaggeredGridItem({
  children,
  className,
  hoverLift = true,
}: StaggeredGridItemProps) {
  const tier = useAnimationTier();

  if (tier === "none") {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerCardVariants}
      whileHover={
        hoverLift && tier === "full" ? { y: -4 } : undefined
      }
      transition={
        hoverLift && tier === "full"
          ? { duration: 0.2, ease: "easeOut" }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
