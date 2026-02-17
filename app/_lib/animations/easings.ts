/**
 * Named easing curves extracted from Linear, Vercel, and Raycast homepages.
 * All values are exact WAAPI measurements from production sites.
 */

/** ease-out-quint — Primary entrance easing. Used by Linear + Vercel for section reveals. */
export const EASE_OUT_QUINT = [0.23, 1, 0.32, 1] as const;

/** Linear's standard interaction easing — buttons, links, card hovers. */
export const EASE_INTERACTION = [0.25, 0.46, 0.45, 0.94] as const;

/** easeOutCubic — Raycast's card stagger entrance. */
export const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

/** Vercel's standard — text reveals, button fade-ins. */
export const EASE_VERCEL = [0.25, 0.1, 0.25, 1] as const;

/** Duration constants (ms) following Linear's hierarchy. */
export const DURATION = {
  /** Link hover color change */
  instant: 0.1,
  /** Button hover, all properties */
  fast: 0.15,
  /** Card background hover */
  normal: 0.2,
  /** Tab/accordion content switch */
  medium: 0.32,
  /** Section entrance (fade-up-blur) */
  entrance: 0.7,
  /** Hero title sequence */
  hero: 1.0,
  /** Animated border glow loop */
  glow: 3.0,
  /** Carousel auto-advance */
  carousel: 5.0,
} as const;

/** Stagger delays between animated children. */
export const STAGGER = {
  /** Word-by-word text reveal */
  word: 0.045,
  /** Card grid entrance */
  card: 0.08,
  /** Fast list items */
  fast: 0.03,
} as const;
