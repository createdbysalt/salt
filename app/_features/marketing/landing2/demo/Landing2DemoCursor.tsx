"use client";

import { motion } from "framer-motion";
import type { CursorPosition } from "./useWorkspaceDemoTimeline";

type Props = {
  position: CursorPosition;
  pressing?: boolean;
  visible?: boolean;
  opacity?: number;
};

export function Landing2DemoCursor({
  position,
  pressing = false,
  visible = true,
  opacity = 1,
}: Props) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-50 transition-opacity duration-200 ease-out"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        opacity: visible ? opacity : 0,
        willChange: "transform, opacity",
      }}
      aria-hidden
    >
      {pressing && (
        <motion.span
          key="press"
          initial={{ opacity: 0.6, scale: 0.4 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20"
          style={{ left: 5.5, top: 3.2 }}
        />
      )}
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none" className="drop-shadow-md">
        <path
          d="M5.5 3.2L5.5 22.8L9.8 18.2L13.2 25.5L16.2 24.1L12.8 16.8L18.5 16.8L5.5 3.2Z"
          fill="var(--foreground)"
          stroke="var(--background)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
