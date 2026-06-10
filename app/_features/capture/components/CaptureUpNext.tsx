"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";
import { ORIGIN_META, type PendingCapture } from "@/app/_lib/demo/capture-demo-data";

type Props = {
  captures: PendingCapture[];
  viewIdx: number;
  onJump: (idx: number) => void;
  disabled?: boolean;
};

export function CaptureUpNext({ captures, viewIdx, onJump, disabled }: Props) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="hidden w-[260px] shrink-0 flex-col lg:flex"
      aria-label="Up next"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
          Up next
        </p>
        <span className="text-[11px] tabular-nums text-white/80">
          {Math.max(0, captures.length - viewIdx - 1)} after
        </span>
      </div>

      <div className="glass-card max-h-[560px] space-y-1 overflow-y-auto rounded-2xl p-2">
        {captures.length === 0 && (
          <p className="p-3 text-[12px] text-muted-foreground">No captures in queue.</p>
        )}
        {captures.map((c, i) => {
          const origin = ORIGIN_META[c.origin];
          const Icon = origin.icon;
          const isActive = i === viewIdx;
          const isPast = i < viewIdx;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => !disabled && onJump(i)}
              disabled={disabled}
              className={cn(
                "group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                isActive
                  ? "bg-muted"
                  : isPast
                    ? "opacity-50 hover:bg-muted/40 hover:opacity-80"
                    : "hover:bg-muted/60"
              )}
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-foreground/70">
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {origin.label}
                  </span>
                  {isActive && <span className="size-1.5 animate-pulse rounded-full bg-flame" />}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[12.5px] leading-snug",
                    isActive ? "font-semibold" : "font-medium text-foreground/85"
                  )}
                >
                  {c.headline}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {c.proposedRoute.label}
                </span>
              </span>
              <span className="mt-1 shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
}
