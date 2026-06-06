"use client";

import { motion } from "framer-motion";
import type { CursorPosition } from "./useWorkspaceDemoTimeline";

const TAP_DOT_SIZE = 40;

type Props = {
  position: CursorPosition;
  tapping?: boolean;
  swiping?: boolean;
  visible?: boolean;
  opacity?: number;
};

export function Landing2DemoTap({
  position,
  tapping = false,
  swiping = false,
  visible = true,
  opacity = 1,
}: Props) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-50"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        opacity: visible ? opacity : 0,
        willChange: "transform, opacity",
      }}
      aria-hidden
    >
      <motion.div
        animate={{ scale: tapping ? 0.88 : swiping ? 0.95 : 1 }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        className="relative"
        style={{ width: TAP_DOT_SIZE, height: TAP_DOT_SIZE }}
      >
        {tapping && (
          <motion.span
            key="tap-ripple"
            initial={{ opacity: 0.5, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.6 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 rounded-full bg-foreground/20"
          />
        )}

        {swiping && (
          <motion.span
            className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground/15"
            style={{ height: 28, marginTop: -24 }}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 0.55, 0], scaleY: [0, 1, 1.15] }}
            transition={{ duration: 0.75, ease: "easeOut", repeat: Infinity }}
          />
        )}

        <span
          className="absolute inset-0 rounded-full border border-black/8 bg-white/95 shadow-[0_2px_10px_rgba(0,0,0,0.14)]"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)" }}
        />
        <span className="absolute inset-[11px] rounded-full bg-foreground/8" />
      </motion.div>
    </div>
  );
}
