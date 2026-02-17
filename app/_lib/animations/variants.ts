import type { Variants } from "framer-motion";
import {
  DURATION,
  STAGGER,
} from "./easings";

/**
 * Fade-up-blur section entrance.
 * Desktop: opacity + blur(6px) + translateY(24px)
 * Mobile: opacity + translateY(24px) (no blur for GPU savings)
 */
export const fadeUpBlurVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: DURATION.entrance,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

/** Mobile-safe version without blur filter. */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.entrance,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

/** Word-by-word stagger container. */
export const wordContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.word,
      delayChildren: 0.1,
    },
  },
};

/** Individual word entrance with blur. */
export const wordVariants: Variants = {
  hidden: { opacity: 0, y: "100%", filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: "0%",
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

/** Mobile-safe word entrance (no blur). */
export const wordVariantsMinimal: Variants = {
  hidden: { opacity: 0, y: "50%" },
  visible: {
    opacity: 1,
    y: "0%",
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

/** Staggered card grid container. */
export const staggerGridContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.card,
      delayChildren: 0.1,
    },
  },
};

/** Individual card in a staggered grid (Raycast pattern). */
export const staggerCardVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.entrance,
      ease: [0.215, 0.61, 0.355, 1],
    },
  },
};

/** Simple fade entrance for generic elements. */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.medium },
  },
};
