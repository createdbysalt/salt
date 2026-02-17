"use client";

import { useState, useEffect, useCallback } from "react";

// Tailwind CSS 4 breakpoints
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Returns true when viewport is >= the given breakpoint.
 * SSR-safe: returns false on the server.
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(
      `(min-width: ${BREAKPOINTS[breakpoint]}px)`
    );
    setMatches(query.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [breakpoint]);

  return matches;
}

/**
 * Returns true if the user prefers reduced motion.
 * SSR-safe: returns false on the server (assumes motion is OK).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/**
 * Returns the animation tier based on viewport + reduced motion preference.
 *
 * - `"none"` — prefers-reduced-motion: reduce. No animations.
 * - `"minimal"` — Mobile (<768px). Fade + translateY only, no blur/parallax.
 * - `"full"` — Desktop (>=768px). Blur reveals, hover effects, gradients.
 *
 * SSR-safe: returns `"minimal"` on the server (safe baseline).
 */
export type AnimationTier = "none" | "minimal" | "full";

export function useAnimationTier(): AnimationTier {
  const reduced = useReducedMotion();
  const isDesktop = useBreakpoint("md");

  if (reduced) return "none";
  if (isDesktop) return "full";
  return "minimal";
}

/**
 * Returns a stable callback that checks if we should animate.
 * Useful for imperative animation triggers.
 */
export function useShouldAnimate(): () => boolean {
  const tier = useAnimationTier();
  return useCallback(() => tier !== "none", [tier]);
}
