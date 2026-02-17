"use client";

import { useInView, useMotionValue, useTransform, animate, motion } from "framer-motion";
import { useRef, useEffect } from "react";
import { useAnimationTier } from "@/app/_lib/animations/hooks";

interface AnimatedCounterProps {
  /** Target value to count to. */
  value: number;
  /** Prefix (e.g., "$"). */
  prefix?: string;
  /** Suffix (e.g., "%", "k", "+"). */
  suffix?: string;
  /** Duration in seconds. Default: 1.5 */
  duration?: number;
  /** Trigger only once. Default: true */
  once?: boolean;
  className?: string;
}

/**
 * Animated number counter that triggers when scrolling into view.
 * Counts from 0 to the target value using a MotionValue for performance.
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1.5,
  once = true,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, amount: 0.5 });
  const tier = useAnimationTier();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    if (tier === "none") {
      motionValue.set(value);
      return;
    }

    if (!isInView) return;

    const controls = animate(motionValue, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
    });

    return () => controls.stop();
  }, [isInView, value, duration, tier, motionValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
