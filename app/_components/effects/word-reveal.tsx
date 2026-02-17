"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useAnimationTier } from "@/app/_lib/animations/hooks";
import {
  wordContainerVariants,
  wordVariants,
  wordVariantsMinimal,
} from "@/app/_lib/animations/variants";

interface WordRevealProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  className?: string;
  /** Delay before the first word starts (seconds). Default: 0 */
  delay?: number;
  /** Trigger only once. Default: true */
  once?: boolean;
}

/**
 * Staggered word-by-word blur-up text reveal.
 * Inspired by Vercel (blur(10px)) and Linear (blur(4px)) hero animations.
 * Degrades gracefully: full → minimal (no blur) → none (instant).
 */
export function WordReveal({
  text,
  as: Tag = "h1",
  className,
  delay = 0,
  once = true,
}: WordRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once, amount: 0.3 });
  const tier = useAnimationTier();

  if (tier === "none") {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(" ");
  const itemVariants = tier === "full" ? wordVariants : wordVariantsMinimal;

  // We need to cast because motion doesn't have a generic "as" prop for all HTML tags
  const MotionTag = motion[Tag] as typeof motion.h1;

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLHeadingElement>}
      className={className}
      variants={{
        hidden: wordContainerVariants.hidden,
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.045,
            delayChildren: delay + 0.1,
          },
        },
      }}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={itemVariants}
          style={{ display: "inline-block", marginRight: "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
    </MotionTag>
  );
}
