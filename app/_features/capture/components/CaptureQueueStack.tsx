"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Pencil, Workflow, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { ApproveCelebration, useApproveCelebration } from "@/app/_features/plays/components/ApproveCelebration";
import type { PendingCapture } from "@/app/_lib/demo/capture-demo-data";
import { CaptureCard } from "./CaptureCard";
import { CaptureUpNext } from "./CaptureUpNext";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type Props = {
  captures: PendingCapture[];
  onProgress: (reviewed: number) => void;
  onAddContext?: (c: PendingCapture) => void;
  askOpen?: boolean;
  showUpNext?: boolean;
};

export function CaptureQueueStack({
  captures,
  onProgress,
  onAddContext,
  askOpen = false,
  showUpNext = true,
}: Props) {
  const [remaining, setRemaining] = useState<PendingCapture[]>(captures);
  const [viewIdx, setViewIdx] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [exiting, setExiting] = useState<
    null | "left" | "right" | "up" | "nav-next" | "nav-prev"
  >(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const { burst, fireCelebration } = useApproveCelebration();

  useEffect(() => {
    setRemaining(captures);
    setViewIdx(0);
    setReviewedCount(0);
    setExiting(null);
  }, [captures]);

  useEffect(() => {
    onProgress(reviewedCount);
  }, [reviewedCount, onProgress]);

  const active = remaining[viewIdx];
  const canPrev = viewIdx > 0;
  const canNext = viewIdx < remaining.length - 1;

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    setCardHeight(el.getBoundingClientRect().height);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCardHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [active?.id]);

  const advance = useCallback(
    (kind: "confirm" | "dismiss" | "reroute") => {
      if (!active || exiting) return;
      setExiting(kind === "confirm" ? "right" : kind === "reroute" ? "up" : "left");
      if (kind === "confirm") {
        fireCelebration(confirmBtnRef.current);
        toast.success("Confirmed", { description: `Routed to ${active.proposedRoute.label}` });
      } else if (kind === "reroute") {
        toast("Re-route", { description: "Pick a destination — coming soon." });
      } else {
        toast("Dismissed");
      }
      window.setTimeout(() => {
        setRemaining((list) => list.filter((_, i) => i !== viewIdx));
        setViewIdx((i) => {
          const newLen = remaining.length - 1;
          return Math.min(i, Math.max(0, newLen - 1));
        });
        setReviewedCount((r) => r + 1);
        setExiting(null);
      }, 320);
    },
    [active, exiting, viewIdx, remaining.length, fireCelebration]
  );

  const navigate = useCallback(
    (dir: "next" | "prev") => {
      if (exiting) return;
      if (dir === "next" && !canNext) return;
      if (dir === "prev" && !canPrev) return;
      setExiting(dir === "next" ? "nav-next" : "nav-prev");
      window.setTimeout(() => {
        setViewIdx((i) => i + (dir === "next" ? 1 : -1));
        setExiting(null);
      }, 220);
    },
    [exiting, canNext, canPrev]
  );

  const jumpTo = useCallback(
    (idx: number) => {
      if (exiting) return;
      if (idx === viewIdx) return;
      if (idx < 0 || idx >= remaining.length) return;
      setExiting(idx > viewIdx ? "nav-next" : "nav-prev");
      window.setTimeout(() => {
        setViewIdx(idx);
        setExiting(null);
      }, 220);
    },
    [exiting, viewIdx, remaining.length]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "c" || e.key === "C") advance("confirm");
      else if (e.key === "d" || e.key === "D") advance("dismiss");
      else if (e.key === "r" || e.key === "R") advance("reroute");
      else if (e.key === "e" || e.key === "E") {
        if (active && onAddContext) onAddContext(active);
      } else if (e.key === "ArrowRight") navigate("next");
      else if (e.key === "ArrowLeft") navigate("prev");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, navigate, active, onAddContext]);

  if (!captures.length) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center">
        <p className="font-display text-2xl tracking-tight">Nothing waiting</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Salt will surface the next capture here when it&apos;s ready.
        </p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center">
        <p className="font-display text-2xl tracking-tight">Caught up</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviewed {reviewedCount} captures. Nice work.
        </p>
      </div>
    );
  }

  const exitAnim =
    exiting === "right"
      ? { x: 480, opacity: 0, rotate: 4 }
      : exiting === "left"
        ? { x: -480, opacity: 0, rotate: -4 }
        : exiting === "up"
          ? { y: -300, opacity: 0 }
          : exiting === "nav-next"
            ? { x: -40, opacity: 0 }
            : exiting === "nav-prev"
              ? { x: 40, opacity: 0 }
              : { opacity: 0 };

  return (
    <div
      className={cn(
        "flex items-start justify-center gap-6",
        showUpNext ? "" : "flex-col items-center"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col items-center self-stretch">
        <div className="flex min-h-[calc(100vh-360px)] w-full flex-1 items-center pb-24">
          <div className="relative mx-auto flex w-full items-center gap-2">
            <NavArrow
              direction="prev"
              disabled={!canPrev || !!exiting}
              onClick={() => navigate("prev")}
            />

            <div
              className="relative mx-auto min-w-0 max-w-[1080px] flex-1 rounded-3xl"
              style={{
                height: cardHeight ?? undefined,
                minHeight: cardHeight ? undefined : 560,
                boxShadow:
                  "0 0 0 1px color-mix(in oklab, var(--flame) 18%, transparent), 0 24px 60px -24px color-mix(in oklab, var(--flame) 22%, transparent), 0 8px 24px -12px color-mix(in oklab, var(--violet) 18%, transparent)",
              }}
            >
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={active.id}
                  ref={cardRef}
                  initial={{ scale: 0.96, y: 12, opacity: 0 }}
                  animate={
                    exiting ? exitAnim : { scale: 1, y: 0, opacity: 1, rotate: 0, x: 0 }
                  }
                  transition={{ duration: 0.32, ease: APPLE_EASE }}
                  className="relative"
                  style={{ zIndex: 3 }}
                >
                  <CaptureCard capture={active} />
                </motion.div>
              </AnimatePresence>
            </div>

            <NavArrow
              direction="next"
              disabled={!canNext || !!exiting}
              onClick={() => navigate("next")}
            />
          </div>
        </div>

        <div
          className={cn(
            "pointer-events-none sticky bottom-6 z-20 mt-8 flex items-center justify-center transition-[margin] duration-400 ease-out",
            askOpen ? "md:-ml-[172px]" : ""
          )}
        >
          <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/95 p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <DockButton onClick={() => advance("dismiss")} label="Dismiss" shortcut="D">
              <X className="size-[18px]" strokeWidth={2} />
            </DockButton>

            <DockButton
              onClick={() => active && onAddContext?.(active)}
              label="Add context"
              shortcut="E"
              disabled={!onAddContext}
            >
              <Pencil className="size-[18px]" strokeWidth={2} />
            </DockButton>

            <DockButton onClick={() => advance("reroute")} label="Re-route" shortcut="R">
              <Workflow className="size-[18px]" strokeWidth={2} />
            </DockButton>

            <button
              ref={confirmBtnRef}
              type="button"
              onClick={() => advance("confirm")}
              title="Confirm & route (C)"
              className={cn(
                "group mx-0.5 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[13px] font-semibold text-white",
                "surface-aurora shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--flame)_45%,transparent)]",
                "transition-all hover:scale-[1.02] active:scale-[0.97]"
              )}
            >
              <CheckCircle2 className="size-4 shrink-0" strokeWidth={2.5} />
              <span>Confirm &amp; route</span>
            </button>
          </div>
        </div>
      </div>

      {showUpNext && (
        <div className="flex min-h-[calc(100vh-360px)] items-center pb-24">
          <CaptureUpNext
            captures={remaining}
            viewIdx={viewIdx}
            onJump={jumpTo}
            disabled={!!exiting}
          />
        </div>
      )}
      <ApproveCelebration burst={burst} />
    </div>
  );
}

function DockButton({
  children,
  label,
  shortcut,
  ...rest
}: {
  children: ReactNode;
  label: string;
  shortcut: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (${shortcut})`}
      {...rest}
      className="group relative inline-flex size-11 items-center justify-center rounded-full text-foreground/70 transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
      <span className="pointer-events-none absolute -bottom-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {shortcut}
      </span>
    </button>
  );
}

function NavArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous capture" : "Next capture"}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border transition-all",
        "border-border/60 bg-card/80 text-foreground/70 backdrop-blur",
        "hover:scale-105 hover:border-border hover:bg-card hover:text-foreground",
        "active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
      )}
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  );
}
