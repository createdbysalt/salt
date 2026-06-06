"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@repo/utils";
import { composioBrand } from "./composioBrandIcons";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const TOOL_SLUGS = [
  "gmail",
  "slack",
  "hubspot",
  "googlecalendar",
  "notion",
  "stripe",
] as const;

type ToolSlug = (typeof TOOL_SLUGS)[number];

const BEFORE_ASSETS = {
  desktop: "/landing/before/desktop-chaos.png",
  gmail: "/landing/before/gmail-overload.png",
  projects: "/landing/before/projects-fire.png",
  notification: "/landing/before/notification-alex.png",
} as const;

const approvalItems = [
  "Proposal revision — ready",
  "Scheduling conflict — resolved",
  "Client feedback — queued",
] as const;

const playsGmail = composioBrand("gmail");
const playsSlack = composioBrand("slack");
const playsCalendar = composioBrand("googlecalendar");

function ToolGhostTile({
  slug,
  className,
  style,
  opacity = 0.55,
}: {
  slug: ToolSlug;
  className?: string;
  style?: CSSProperties;
  opacity?: number;
}) {
  const brand = composioBrand(slug);
  const Icon = brand.Icon;

  return (
    <div
      className={cn(
        "pointer-events-none flex w-[4.25rem] flex-col items-center gap-1 rounded-lg border border-foreground/8 bg-card/90 px-1.5 py-2 shadow-sm sm:w-[4.75rem]",
        className,
      )}
      style={{ ...style, opacity }}
    >
      <Icon className={cn("size-3.5 sm:size-4", brand.color)} aria-hidden />
      <span className="w-full truncate text-center text-[7px] font-medium text-muted-foreground sm:text-[8px]">
        {brand.label}
      </span>
    </div>
  );
}

/** Before — cluttered desktop, notification pile-up, inbox on fire. */
function BeforeChaosScene({ reduce }: { reduce: boolean }) {
  const float = (delay: number, y = 5) =>
    reduce
      ? undefined
      : {
          y: [0, y, 0],
          rotate: [0, delay % 2 === 0 ? 0.6 : -0.6, 0],
        };

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" aria-hidden>
      <img
        src={BEFORE_ASSETS.desktop}
        alt=""
        className="absolute inset-0 h-full w-full scale-[1.08] object-cover opacity-[0.55]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/55 to-ink/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_0%,oklch(0.06_0.004_50/0.85)_100%)]" />

      <motion.img
        src={BEFORE_ASSETS.gmail}
        alt=""
        className="absolute left-[8%] top-[10%] w-[42%] max-w-[9.5rem] drop-shadow-[0_12px_40px_oklch(0_0_0/0.55)]"
        animate={float(0, 4)}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.img
        src={BEFORE_ASSETS.projects}
        alt=""
        className="absolute right-[4%] top-[14%] w-[46%] max-w-[10.5rem] drop-shadow-[0_14px_44px_oklch(0_0_0/0.5)]"
        animate={float(1, 6)}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />

      <motion.img
        src={BEFORE_ASSETS.notification}
        alt=""
        className="absolute bottom-[12%] left-1/2 w-[78%] max-w-[15rem] -translate-x-1/2 drop-shadow-[0_16px_48px_oklch(0_0_0/0.6)]"
        animate={float(2, 3)}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
    </div>
  );
}

function AlignedGhostGrid() {
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 place-items-center gap-x-3 gap-y-4 px-6 pt-8 sm:gap-x-4 sm:px-8"
      aria-hidden
    >
      {TOOL_SLUGS.map((slug) => (
        <ToolGhostTile key={slug} slug={slug} opacity={0.22} />
      ))}
    </div>
  );
}

function AfterForeground({ reduce }: { reduce: boolean }) {
  const GmailIcon = playsGmail.Icon;
  const SlackIcon = playsSlack.Icon;
  const CalendarIcon = playsCalendar.Icon;

  return (
    <div className="relative z-10 flex h-full items-center justify-center px-4 py-8 sm:px-5">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: APPLE_EASE }}
        className="w-full max-w-[16.5rem] glass-card rounded-2xl border border-foreground/10 p-3.5 shadow-[var(--shadow-lift)] sm:p-4"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <span className="grid size-6 place-items-center rounded-lg border border-border/60 bg-background ring-2 ring-card">
                <GmailIcon className={cn("size-3", playsGmail.color)} aria-hidden />
              </span>
              <span className="grid size-6 place-items-center rounded-lg border border-border/60 bg-background ring-2 ring-card">
                <SlackIcon className={cn("size-3", playsSlack.color)} aria-hidden />
              </span>
              <span className="grid size-6 place-items-center rounded-lg border border-border/60 bg-background ring-2 ring-card">
                <CalendarIcon className={cn("size-3", playsCalendar.color)} aria-hidden />
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Today
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-flame/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-flame">
            <Sparkles className="size-2.5" strokeWidth={2.5} aria-hidden />
            3 plays
          </span>
        </header>

        <ul className="space-y-2">
          {approvalItems.map((label, i) => (
            <motion.li
              key={label}
              initial={reduce ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: APPLE_EASE, delay: 0.08 + i * 0.1 }}
              className="flex items-center gap-2.5 rounded-xl border border-foreground/8 bg-card px-2.5 py-2"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              <span className="text-[11px] font-medium leading-snug">{label}</span>
            </motion.li>
          ))}
        </ul>

        <p className="mt-3 text-center text-[10px] font-medium tabular-nums text-muted-foreground">
          12 minutes · 3 decisions
        </p>
      </motion.div>
    </div>
  );
}

export function TransformationContrastVisual({ phase }: { phase: "before" | "after" }) {
  const reduce = useReducedMotion();
  const isAfter = phase === "after";

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-foreground/10 shadow-[var(--shadow-card)]",
        isAfter
          ? "bg-gradient-to-br from-sky/[0.06] via-card to-violet/[0.08]"
          : "bg-ink",
      )}
    >
      <div className="absolute left-4 top-4 z-20">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.22em]",
            isAfter ? "text-muted-foreground" : "text-cream/55",
          )}
        >
          {isAfter ? "After" : "Before"}
        </span>
      </div>

      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: isAfter ? 0 : 1 }}
        transition={{ duration: 0.5, ease: APPLE_EASE }}
      >
        <BeforeChaosScene reduce={!!reduce} />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: isAfter ? 1 : 0 }}
        transition={{ duration: 0.5, ease: APPLE_EASE }}
      >
        <AlignedGhostGrid />
      </motion.div>

      <motion.div
        key={phase}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: APPLE_EASE }}
        className="absolute inset-0"
      >
        {isAfter && <AfterForeground reduce={!!reduce} />}
      </motion.div>
    </div>
  );
}
