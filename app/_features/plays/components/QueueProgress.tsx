"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@repo/utils";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function QueueProgress({
  total,
  reviewed,
  streak,
}: {
  total: number;
  reviewed: number;
  streak: number;
}) {
  const dots = Array.from({ length: total }, (_, i) => i < reviewed);
  const showStreak = streak >= 2;
  const milestone = streak >= 10 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        {dots.map((done, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={{
              scale: done ? 1 : 0.75,
              opacity: done ? 1 : 1,
            }}
            transition={{ duration: 0.3, ease: APPLE_EASE }}
            className={cn(
              "size-2 rounded-full",
              done
                ? "bg-flame shadow-[0_0_10px_color-mix(in_oklab,var(--flame)_70%,transparent)]"
                : "bg-white/50 ring-1 ring-white/20"
            )}
          />
        ))}
      </div>
      <span className="text-[12px] font-medium tabular-nums text-white/85">
        {reviewed} of {total} reviewed
      </span>
      <AnimatePresence>
        {showStreak && (
          <motion.div
            key={`streak-${milestone}`}
            initial={{ opacity: 0, scale: 0.7, y: 4 }}
            animate={{ opacity: 1, scale: 1 + milestone * 0.05, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 360, damping: 22 }}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold",
              milestone >= 1
                ? "border-flame/30 bg-flame/15 text-flame shadow-[0_0_18px_color-mix(in_oklab,var(--flame)_25%,transparent)]"
                : "border-border/60 bg-muted text-foreground/80"
            )}
          >
            <Flame className="size-3.5" strokeWidth={2.5} />
            {streak} in a row
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
