"use client";

import * as React from "react";

import { cn } from "@repo/utils";

interface MagneticHoverProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * Max translation in pixels (very subtle by default).
   */
  maxTranslate?: number;
  /**
   * Max rotation in degrees (very subtle by default).
   */
  maxRotate?: number;
}

export function MagneticHover({
  children,
  className,
  maxTranslate = 6,
  maxRotate = 1.25,
  ...props
}: MagneticHoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const prefersReducedMotionRef = React.useRef(false);

  const targetRef = React.useRef({ x: 0, y: 0, rx: 0, ry: 0 });
  const currentRef = React.useRef({ x: 0, y: 0, rx: 0, ry: 0 });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      prefersReducedMotionRef.current = !!media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const animate = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const t = 0.12; // subtle smoothing

    currentRef.current.x = lerp(currentRef.current.x, targetRef.current.x, t);
    currentRef.current.y = lerp(currentRef.current.y, targetRef.current.y, t);
    currentRef.current.rx = lerp(currentRef.current.rx, targetRef.current.rx, t);
    currentRef.current.ry = lerp(currentRef.current.ry, targetRef.current.ry, t);

    el.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0) rotateX(${currentRef.current.rx}deg) rotateY(${currentRef.current.ry}deg)`;

    rafRef.current = window.requestAnimationFrame(animate);
  }, []);

  const stop = React.useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(animate);
  }, [animate]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotionRef.current) return;
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1

    const nx = (px - 0.5) * 2; // -1..1
    const ny = (py - 0.5) * 2; // -1..1

    // Translate “away” from cursor slightly (push feel) + subtle tilt
    targetRef.current.x = nx * maxTranslate;
    targetRef.current.y = ny * maxTranslate;
    targetRef.current.rx = -ny * maxRotate;
    targetRef.current.ry = nx * maxRotate;

    start();
  };

  const handleMouseLeave = () => {
    targetRef.current = { x: 0, y: 0, rx: 0, ry: 0 };
    start();

    // Stop once we’re basically at rest
    window.setTimeout(() => {
      const c = currentRef.current;
      const nearZero =
        Math.abs(c.x) < 0.05 &&
        Math.abs(c.y) < 0.05 &&
        Math.abs(c.rx) < 0.05 &&
        Math.abs(c.ry) < 0.05;
      if (nearZero) stop();
    }, 350);
  };

  React.useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <div
      ref={ref}
      className={cn("will-change-transform [transform-style:preserve-3d]", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
}

