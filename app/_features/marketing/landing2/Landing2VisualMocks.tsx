"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Check,
  Clock3,
  Lightbulb,
  Mail,
  Rocket,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@repo/utils";
import { COMPOSIO_BRANDS, FAMOUS_COMPOSIO_BRANDS, composioBrand } from "./composioBrandIcons";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

/** Quo-style: transparent shell; list rows sit on the parent tile surface. */
const TILE_VISUAL = "relative w-full min-h-[152px]";

const playsGmailBrand = composioBrand("gmail");
const playsStripeBrand = composioBrand("stripe");
const playsSlackBrand = composioBrand("slack");
const playsCalendarBrand = composioBrand("googlecalendar");
const playsUpNext = [
  {
    subject: "Schedule Luma check-in for Friday",
    primary: playsCalendarBrand,
    secondary: playsSlackBrand,
  },
  { subject: "Follow up on Atlas proposal", primary: playsGmailBrand },
] as const;

const playsFocus = {
  subject: "Send milestone invoice to Brightline",
  recipient: "Priya Shah · Brightline Legal",
  trigger: playsStripeBrand,
  channel: playsGmailBrand,
  draft:
    "Hi Priya, Phase 2 wrapped yesterday. Invoice #BL-1048 for $8,400 is ready to send with the deliverables summary attached.",
} as const;

/** Plays — focus card with draft + approve CTA; queue peeks behind. */
export function CapabilityPlaysVisual() {
  const reduce = useReducedMotion();
  const TriggerIcon = playsFocus.trigger.Icon;
  const ChannelIcon = playsFocus.channel.Icon;

  return (
    <div className={cn(TILE_VISUAL, "relative flex flex-col items-start justify-end")}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10, rotate: -0.75 }}
        whileInView={{ opacity: 1, y: 0, rotate: -0.5 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: APPLE_EASE }}
        className="relative z-10 w-[90%] glass-card rounded-2xl p-3 shadow-[var(--shadow-card)] sm:p-3.5"
      >
        <header className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
            Up next
          </p>
          <span className="chip shrink-0 px-2 py-0.5 text-[9px] tabular-nums">3</span>
        </header>
        <ul className="space-y-1.5">
          {playsUpNext.map((play) => {
            const PrimaryIcon = play.primary.Icon;
            const secondary = "secondary" in play ? play.secondary : null;
            const SecondaryIcon = secondary?.Icon ?? null;

            return (
              <li key={play.subject} className="flex items-center gap-2 rounded-xl px-1 py-1">
                {SecondaryIcon && secondary ? (
                  <div className="flex -space-x-1.5 shrink-0">
                    <span className="grid size-6 place-items-center rounded-lg border border-border/60 bg-background ring-2 ring-background">
                      <PrimaryIcon className={cn("size-3", play.primary.color)} aria-hidden />
                    </span>
                    <span className="grid size-6 place-items-center rounded-lg border border-border/60 bg-background ring-2 ring-background">
                      <SecondaryIcon className={cn("size-3", secondary.color)} aria-hidden />
                    </span>
                  </div>
                ) : (
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-border/60 bg-background">
                    <PrimaryIcon className={cn("size-3", play.primary.color)} aria-hidden />
                  </span>
                )}
                <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {play.subject}
                </p>
              </li>
            );
          })}
        </ul>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14, rotate: 0.75 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0.35 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: APPLE_EASE, delay: 0.08 }}
        className="relative z-20 -mt-14 ml-auto w-[96%] glass-card rounded-2xl p-3 shadow-[var(--shadow-lift)] sm:-mt-16 sm:p-3.5"
      >
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex -space-x-1.5 shrink-0">
              <span className="grid size-7 place-items-center rounded-xl border border-border/60 bg-background ring-2 ring-background sm:size-8">
                <TriggerIcon className={cn("size-3.5 sm:size-4", playsFocus.trigger.color)} aria-hidden />
              </span>
              <span className="grid size-7 place-items-center rounded-xl border border-border/60 bg-background ring-2 ring-background sm:size-8">
                <ChannelIcon className={cn("size-3.5 sm:size-4", playsFocus.channel.color)} aria-hidden />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold tracking-tight sm:text-xs">{playsFocus.subject}</p>
              <p className="mt-0.5 truncate text-[9px] text-muted-foreground sm:text-[10px]">{playsFocus.recipient}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-flame/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-flame sm:text-[9px]">
            <Sparkles className="size-2.5" strokeWidth={2.5} />
            Awaiting
          </span>
        </header>

        <div className="mt-3 rounded-xl border border-border/60 bg-card/70 p-2.5 sm:p-3">
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[9px]">
            Draft to send
          </p>
          <p className="mt-1.5 line-clamp-3 text-[10px] leading-relaxed text-foreground/90 sm:text-[11px]">
            {playsFocus.draft}
          </p>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[10px] font-semibold text-background sm:text-[11px]">
          <Check className="size-3.5 shrink-0" strokeWidth={2.5} />
          Approve &amp; send
        </div>
      </motion.div>
    </div>
  );
}

const intelligenceClient = {
  name: "Luma Health",
  score: 44,
  label: "At risk",
  trend: -8,
} as const;

const intelligenceReasons = [
  { label: "Going quiet", value: "21d", tone: "risk" as const },
  { label: "Open balance", value: "$4.8k", tone: "watch" as const },
  { label: "Launch readiness", value: "Tue", tone: "good" as const },
] as const;

const INTELLIGENCE_TONE_DOT = {
  good: "bg-emerald-500",
  watch: "bg-flame",
  risk: "bg-destructive",
} as const;

function IntelligenceHealthRing({ value }: { value: number }) {
  const r = 28;
  const C = 2 * Math.PI * r;

  return (
    <div className="relative size-[118px] sm:size-[128px]">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="url(#intelligenceCapRingGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${C}` }}
          whileInView={{ strokeDasharray: `${(value / 100) * C} ${C}` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: APPLE_EASE, delay: 0.15 }}
        />
        <defs>
          <linearGradient id="intelligenceCapRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.46 0.12 175)" />
            <stop offset="100%" stopColor="oklch(0.80 0.16 70)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-3xl tabular-nums leading-none sm:text-4xl">{value}</p>
          <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">Score</p>
        </div>
      </div>
    </div>
  );
}

/** Intelligence — health ring card with always-on score breakdown popover. */
export function CapabilityIntelligenceVisual() {
  const reduce = useReducedMotion();
  const trendUp = intelligenceClient.trend >= 0;
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;

  return (
    <div className={cn(TILE_VISUAL, "relative min-h-[220px] flex items-end sm:min-h-[240px]")}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: APPLE_EASE }}
        className="relative z-10 flex aspect-square w-[86%] min-w-0 max-w-[248px] flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)] sm:min-w-[200px] sm:p-5"
      >
        <header className="mb-1 flex items-center justify-between gap-2">
          <span className="chip px-2 py-0.5 text-[8px] sm:text-[9px]">Client health</span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[9px] font-semibold sm:text-[10px]",
              trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-flame",
            )}
          >
            <TrendIcon className="size-2.5" strokeWidth={2.5} />
            {trendUp ? "+" : ""}
            {intelligenceClient.trend}
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center">
          <IntelligenceHealthRing value={intelligenceClient.score} />
          <p className="mt-1.5 text-[11px] font-semibold text-destructive sm:text-xs">{intelligenceClient.label}</p>
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8, x: 6 }}
        whileInView={{ opacity: 1, y: 0, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: APPLE_EASE, delay: 0.1 }}
        className="absolute right-0 bottom-0 z-20 w-[52%] min-w-[132px] max-w-[168px] rounded-xl border border-border/50 bg-muted/95 p-2.5 shadow-[var(--shadow-lift)] backdrop-blur-sm sm:bottom-1 sm:p-3"
      >
        <header className="mb-2 flex items-center justify-between gap-1.5">
          <p className="truncate text-[9px] font-medium text-muted-foreground sm:text-[10px]">
            {intelligenceClient.name}
          </p>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 text-[9px] font-semibold sm:text-[10px]",
              trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-flame",
            )}
          >
            <TrendIcon className="size-2.5" strokeWidth={2.5} />
            {trendUp ? "+" : ""}
            {intelligenceClient.trend}
          </span>
        </header>
        <ul className="space-y-1.5">
          {intelligenceReasons.map((reason) => (
            <li key={reason.label} className="flex items-center gap-1.5">
              <span className={cn("size-2 shrink-0 rounded-full", INTELLIGENCE_TONE_DOT[reason.tone])} aria-hidden />
              <p className="min-w-0 flex-1 truncate text-[9px] font-medium sm:text-[10px]">{reason.label}</p>
              <p className="shrink-0 text-[9px] tabular-nums text-muted-foreground sm:text-[10px]">{reason.value}</p>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

const showcasePlaybook = {
  owner: "Brief play",
  name: "Project kickoff",
  purpose: "Book the kickoff, send the brief, and start the project without the admin scramble.",
  steps: 5,
  minutes: 8,
  manualMinutes: 60,
  tag: "Needs approval",
} as const;

const playbookApps = [
  composioBrand("gmail"),
  composioBrand("calendly"),
  composioBrand("zoom"),
  composioBrand("googledrive"),
] as const;

/** Playbooks — single book cover mock for one playbook. */
export function CapabilityPlaybooksVisual() {
  const reduce = useReducedMotion();

  return (
    <div className={cn(TILE_VISUAL, "relative flex min-h-[200px] items-end justify-center sm:min-h-[220px]")}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12, rotate: -4 }}
        whileInView={{ opacity: 1, y: 0, rotate: -2.5 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: APPLE_EASE }}
        className="relative w-[82%] max-w-[232px] sm:max-w-[248px]"
      >
        <div
          className="pointer-events-none absolute -bottom-2 left-[12%] right-[8%] h-5 rounded-[50%] bg-foreground/10 blur-md"
          aria-hidden
        />

        <div className="flex items-stretch overflow-hidden rounded-2xl border border-border/60 shadow-[var(--shadow-lift)]">
          <div
            className="relative flex w-5 shrink-0 items-center justify-center bg-[linear-gradient(180deg,color-mix(in_oklab,var(--sky)_42%,var(--card))_0%,color-mix(in_oklab,var(--sky)_22%,var(--card))_100%)] sm:w-6"
            aria-hidden
          >
            <span className="rotate-180 text-[7px] font-bold uppercase tracking-[0.22em] text-sky/80 [writing-mode:vertical-rl] sm:text-[8px]">
              Playbook
            </span>
            <div className="absolute inset-y-2 right-0 w-px bg-foreground/10" />
          </div>

          <div className="relative min-w-0 flex-1 bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_oklab,var(--sky)_16%,transparent)_0%,transparent_58%),linear-gradient(180deg,var(--card)_0%,color-mix(in_oklab,var(--card)_94%,var(--muted))_100%)] p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky/15 shadow-[0_6px_16px_-8px_color-mix(in_oklab,var(--sky)_55%,transparent)] sm:size-10">
                <Rocket className="size-4 text-sky sm:size-[18px]" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky/90 sm:text-[10px]">
                  {showcasePlaybook.owner}
                </p>
                <h4 className="font-display mt-0.5 text-[17px] leading-tight tracking-tight sm:text-[19px]">
                  {showcasePlaybook.name}
                </h4>
              </div>
            </div>

            <p className="mt-2.5 line-clamp-2 text-[10px] leading-relaxed text-foreground/70 sm:text-[11px]">
              {showcasePlaybook.purpose}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: showcasePlaybook.steps }).map((_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "h-1.5 rounded-full",
                      idx === 0 ? "w-3.5 bg-sky" : "w-1.5 bg-foreground/15",
                    )}
                    aria-hidden
                  />
                ))}
              </div>
              <span className="text-[9px] font-semibold tabular-nums text-muted-foreground sm:text-[10px]">
                {showcasePlaybook.steps} steps
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
              <div className="flex -space-x-1.5">
                {playbookApps.map((app) => (
                  <span
                    key={app.slug}
                    className="grid size-6 place-items-center rounded-full border border-border/60 bg-background ring-2 ring-card sm:size-7"
                  >
                    <app.Icon className={cn("size-3 sm:size-3.5", app.color)} aria-hidden />
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold tabular-nums sm:text-[10px]">
                <Clock3 className="size-2.5 text-muted-foreground" strokeWidth={2.5} />
                <span className="text-foreground">~{showcasePlaybook.minutes}m</span>
                <span className="text-muted-foreground/60 line-through">{showcasePlaybook.manualMinutes}m</span>
              </span>
            </div>

            <span className="mt-3 inline-flex rounded-full bg-flame/12 px-2 py-0.5 text-[8px] font-semibold text-flame sm:text-[9px]">
              {showcasePlaybook.tag}
            </span>
          </div>

          <div
            className="flex w-3 shrink-0 flex-col justify-center gap-[3px] border-l border-border/50 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--muted)_55%,var(--card))_0%,var(--background)_100%)] px-0.5 sm:w-3.5"
            aria-hidden
          >
            {Array.from({ length: 9 }).map((_, idx) => (
              <span key={idx} className="mx-auto h-px w-full max-w-[8px] rounded-full bg-border/80" />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TileRow({
  highlight,
  className,
  children,
}: {
  highlight?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg py-2.5 text-[12px] leading-tight",
        highlight ? "bg-background px-2.5 shadow-[0_1px_2px_oklch(0_0_0/0.04)]" : "px-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

const orbitIcons = FAMOUS_COMPOSIO_BRANDS.slice(0, 6).map(({ Icon, color }) => ({ Icon, color }));

export function LearnOrbitVisual() {
  const reduce = useReducedMotion();
  const n = orbitIcons.length;
  return (
    <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky/20 via-card to-violet/15">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.74_0.10_250/0.25),transparent_65%)]" />
      <div
        className={`relative size-36 ${reduce ? "" : "animate-[spin_22s_linear_infinite]"}`}
      >
        {orbitIcons.map(({ Icon, color }, i) => {
          const deg = (360 / n) * i;
          return (
            <div
              key={i}
              className="absolute inset-0"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <div
                className={`mx-auto flex size-9 items-center justify-center rounded-xl border border-foreground/10 bg-card shadow-[var(--shadow-card)] ${reduce ? "" : "animate-[spin_22s_linear_infinite_reverse]"}`}
                style={{ transform: "translateY(-68px)" }}
              >
                <Icon className={`size-4 ${color}`} />
              </div>
            </div>
          );
        })}
      </div>
      <motion.div
        animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute z-10 flex size-12 items-center justify-center rounded-full bg-foreground shadow-[var(--shadow-lift)]"
      >
        <Sparkles className="size-5 text-background" strokeWidth={2} />
      </motion.div>
    </div>
  );
}

const gmailBrand = composioBrand("gmail");
const notionBrand = composioBrand("notion");

const queueItems = [
  {
    label: "Send payment reminder to Brightline Legal",
    tag: "Invoice nudge",
    Icon: gmailBrand.Icon,
    iconColor: gmailBrand.color,
  },
  {
    label: "Reply to Cedar's scope request",
    tag: "Scope drift",
    Icon: gmailBrand.Icon,
    iconColor: gmailBrand.color,
  },
  {
    label: "Prep brief for Atlas kickoff",
    tag: "Project kickoff",
    Icon: notionBrand.Icon,
    iconColor: notionBrand.color,
  },
];

export function ActQueueVisual() {
  const reduce = useReducedMotion();
  return (
    <div className={cn(TILE_VISUAL, "flex flex-col justify-end")}>
      <div className="divide-y divide-border/60">
        {queueItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: APPLE_EASE, delay: 0.08 + i * 0.07 }}
          >
            <TileRow highlight={i === 0}>
              <item.Icon className={`size-4 shrink-0 ${item.iconColor}`} aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{item.tag}</span>
            </TileRow>
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold"
      >
        <Check className="size-3.5" strokeWidth={2.5} />
        Approve all
      </motion.p>
    </div>
  );
}

export function GrowAutonomyVisual() {
  const reduce = useReducedMotion();
  const barHeights = [28, 46, 58, 72];
  return (
    <div className="flex h-44 flex-col justify-end rounded-xl bg-gradient-to-br from-violet/15 via-card to-sky/10 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Autonomy over time
      </p>
      <div className="flex h-20 items-end gap-2">
        {barHeights.map((h, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { height: 0 }}
            whileInView={{ height: h }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: APPLE_EASE, delay: 0.1 + i * 0.1 }}
            className="flex-1 rounded-t-md bg-gradient-to-t from-sky/40 to-flame/50"
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>Week 1</span>
        <span>Week 8</span>
      </div>
    </div>
  );
}

export function ToolSprawlVisual() {
  const reduce = useReducedMotion();
  const icons = orbitIcons.slice(0, 5);
  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-foreground/10 bg-muted/30 sm:h-72">
      {icons.map(({ Icon, color }, i) => (
        <motion.div
          key={i}
          className="absolute flex size-11 items-center justify-center rounded-xl border border-foreground/10 bg-card shadow-[var(--shadow-card)]"
          style={{
            left: `${12 + (i % 3) * 28}%`,
            top: `${15 + Math.floor(i / 3) * 35}%`,
          }}
          animate={
            reduce
              ? undefined
              : {
                  y: [0, -8, 0],
                  rotate: [0, i % 2 === 0 ? 3 : -3, 0],
                }
          }
          transition={{
            duration: 4 + i * 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        >
          <Icon className={`size-5 ${color}`} />
        </motion.div>
      ))}
      <motion.div
        animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="rounded-full border border-dashed border-foreground/20 px-4 py-2 text-xs text-muted-foreground">
          No single source of truth
        </div>
      </motion.div>
    </div>
  );
}

export function InboxChaosVisual() {
  const reduce = useReducedMotion();
  const rows = [
    { urgent: true, subject: "Re: proposal timeline" },
    { urgent: true, subject: "Can we move the call?" },
    { urgent: false, subject: "Invoice #1042 overdue" },
    { urgent: false, subject: "Quick question on scope" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <motion.div
          key={row.subject}
          animate={
            reduce
              ? undefined
              : {
                  x: i % 2 === 0 ? [0, 2, -2, 0] : [0, -2, 2, 0],
                }
          }
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-background/80 px-3 py-2"
        >
          <Mail className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs">{row.subject}</span>
          {row.urgent && (
            <span className="ml-auto shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
              Urgent
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function SaltMorningVisual() {
  const reduce = useReducedMotion();
  const items = [
    "Proposal revision — ready",
    "Scheduling conflict — resolved",
    "Client feedback — queued",
  ];
  return (
    <div className="space-y-2">
      {items.map((label, i) => (
        <motion.div
          key={label}
          initial={reduce ? false : { opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: APPLE_EASE, delay: 0.2 + i * 0.15 }}
          className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-card px-3 py-2.5 shadow-[var(--shadow-card)]"
        >
          <motion.span
            initial={reduce ? false : { scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 420, damping: 24, delay: 0.35 + i * 0.15 }}
            className="flex size-5 items-center justify-center rounded-full bg-foreground text-background"
          >
            <Check className="size-3" strokeWidth={3} />
          </motion.span>
          <span className="text-xs font-medium">{label}</span>
        </motion.div>
      ))}
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.75 }}
        className="pt-2 text-center text-xs font-medium text-muted-foreground"
      >
        12 minutes · 3 decisions
      </motion.p>
    </div>
  );
}

const todaySchedulePreview = [
  { time: "10:00", title: "Luma Health: launch readiness", who: "Elena Marquez", dur: "30m", hot: true },
  { time: "14:00", title: "Atlas Coaching: kickoff prep", who: "Theo Grant", dur: "30m", hot: false },
  { time: "16:30", title: "Internal: design crit", who: "Alice Chen", dur: "45m", hot: false },
] as const;

const todayHeadsUpPreview = [
  { title: "Luma may be ready for the next project", sub: "Referral partner site, pulled from yesterday's call" },
  { title: "Cedar asking for out-of-scope work", sub: "Two extra landing pages, not in the approved scope" },
  { title: "Gmail, Calendar, Drive, Stripe are organized", sub: "247 emails sorted · 12 docs filed today" },
] as const;

type CaptureStreamItem = {
  source: "found" | "added";
  origin: string;
  headline: string;
  memoryPlace: "People" | "Org" | "Work" | "Notes";
  active?: boolean;
};

const captureSourceIconClass = {
  found: "bg-sky/15 text-sky",
  added: "bg-violet/15 text-violet",
} as const;

const captureStreamPreview: CaptureStreamItem[] = [
  {
    source: "found",
    origin: "Gmail",
    headline: "Client asked for extra work—not in the proposal",
    memoryPlace: "Work",
  },
  {
    source: "added",
    origin: "You",
    headline: "They want project updates in Slack, not email",
    memoryPlace: "People",
    active: true,
  },
  {
    source: "found",
    origin: "Calendar",
    headline: "Kickoff call moved to Thursday at 2pm",
    memoryPlace: "Work",
  },
  {
    source: "found",
    origin: "Gmail",
    headline: "No reply on the proposal for 5 days",
    memoryPlace: "People",
  },
  {
    source: "found",
    origin: "Drive",
    headline: "Signed contract uploaded to the project folder",
    memoryPlace: "Org",
  },
];

/** Capture stream — stacked rows with bottom fade. */
export function CaptureMemoryVisual() {
  const reduce = useReducedMotion();

  return (
    <div className={cn(TILE_VISUAL, "flex h-full min-h-0 flex-col justify-end")}>
      <div className="relative w-full [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]">
        <ul className="flex flex-col gap-1.5">
          {captureStreamPreview.map((item, i) => (
            <motion.li
              key={item.headline}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: APPLE_EASE, delay: 0.04 + i * 0.05 }}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2 py-2 sm:rounded-2xl sm:px-2.5 sm:py-2",
                item.active
                  ? "border-sky/40 bg-sky/10 shadow-[0_0_0_1px_color-mix(in_oklab,var(--sky)_18%,transparent)]"
                  : "border-border/70 bg-background",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-lg sm:size-7 sm:rounded-xl",
                  captureSourceIconClass[item.source],
                )}
              >
                <Sparkles className="size-3 sm:size-3.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium leading-tight sm:text-xs">{item.headline}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <span
                    className={cn(
                      "rounded px-1 py-px text-[7px] font-semibold uppercase tracking-wide sm:text-[8px]",
                      item.source === "found" ? "bg-sky/15 text-sky" : "bg-violet/15 text-violet",
                    )}
                  >
                    {item.source === "found" ? "Found" : "Added"}
                  </span>
                  <span className="text-[8px] text-muted-foreground sm:text-[9px]">{item.origin}</span>
                  <ArrowRight className="size-2 shrink-0 text-muted-foreground/50" strokeWidth={2.5} />
                  <span className="text-[8px] text-muted-foreground sm:text-[9px]">Memory</span>
                </div>
              </div>
              <span className="shrink-0 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">
                {item.memoryPlace}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Morning briefing — overlapping HQ Today side-rail cards. */
export function TodayBriefVisual() {
  const reduce = useReducedMotion();

  return (
    <div className={cn(TILE_VISUAL, "relative flex flex-col items-start")}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10, rotate: -1 }}
        whileInView={{ opacity: 1, y: 0, rotate: -0.75 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: APPLE_EASE }}
        className="relative z-10 w-[92%] glass-card rounded-2xl p-3 shadow-[var(--shadow-card)] sm:p-3.5"
      >
        <header className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" strokeWidth={1.75} />
            <h4 className="truncate text-[11px] font-semibold tracking-tight sm:text-xs">
              Today&apos;s schedule
            </h4>
          </div>
          <span className="chip shrink-0 px-2 py-0.5 text-[9px]">3</span>
        </header>
        <ul className="space-y-0.5">
          {todaySchedulePreview.map((item) => (
            <li key={item.time} className="flex gap-2.5 py-1.5">
              <div className="w-9 shrink-0 pt-px">
                <p className="text-[10px] font-semibold tabular-nums leading-none">{item.time}</p>
                <p className="mt-0.5 text-[8px] text-muted-foreground">{item.dur}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-[10px] font-medium leading-tight sm:text-[11px]">
                    {item.title}
                  </p>
                  {item.hot && <span className="size-1 shrink-0 rounded-full bg-flame" />}
                </div>
                <p className="mt-0.5 truncate text-[8px] text-muted-foreground sm:text-[9px]">
                  {item.who}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12, rotate: 1 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0.5 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: APPLE_EASE, delay: 0.1 }}
        className="relative z-20 -mt-14 ml-auto w-[88%] glass-card rounded-2xl p-3 shadow-[var(--shadow-lift)] sm:-mt-16 sm:p-3.5"
      >
        <header className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Lightbulb className="size-3.5 shrink-0" strokeWidth={1.75} />
            <h4 className="truncate text-[11px] font-semibold tracking-tight sm:text-xs">Heads up</h4>
          </div>
          <span className="chip shrink-0 px-2 py-0.5 text-[9px]">3</span>
        </header>
        <ul className="space-y-2">
          {todayHeadsUpPreview.map((item, i) => (
            <li key={item.title} className="flex gap-2">
              <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md surface-aurora sm:size-6 sm:rounded-lg">
                <span className="relative z-10 text-[8px] font-bold tabular-nums text-white sm:text-[9px]">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[10px] font-medium leading-snug sm:text-[11px]">
                  {item.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-muted-foreground sm:text-[9px]">
                  {item.sub}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

const stripeBrand = composioBrand("stripe");

const breadthPlays = [
  {
    label: "Payment reminder",
    app: "Gmail",
    Icon: gmailBrand.Icon,
    color: gmailBrand.color,
  },
  {
    label: "Kickoff brief",
    app: "Notion",
    Icon: notionBrand.Icon,
    color: notionBrand.color,
  },
  {
    label: "Invoice ready to send",
    app: "Stripe",
    Icon: stripeBrand.Icon,
    color: stripeBrand.color,
  },
];

export function PlaysBreadthVisual() {
  const reduce = useReducedMotion();
  return (
    <div className={cn(TILE_VISUAL, "flex flex-col justify-end")}>
      <div className="divide-y divide-border/60">
        {breadthPlays.map((play, i) => (
          <motion.div
            key={play.label}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: APPLE_EASE, delay: 0.06 + i * 0.07 }}
          >
            <TileRow>
              <play.Icon className={`size-4 shrink-0 ${play.color}`} aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{play.label}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{play.app}</span>
            </TileRow>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function IntelligenceVisual() {
  const reduce = useReducedMotion();
  const bars = [36, 52, 44, 68, 58, 72];
  return (
    <div className={cn(TILE_VISUAL, "flex flex-col justify-end gap-3")}>
      <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
        <TileRow highlight className="rounded-none">
          <span className="inline-flex rounded-full bg-sky/15 px-2 py-0.5 text-[10px] font-semibold text-sky">
            Pattern
          </span>
          <span className="min-w-0 flex-1 font-medium">3 retainer clients went quiet</span>
        </TileRow>
        <div className="border-t border-border/60">
          <TileRow className="rounded-none">
            <span className="min-w-0 flex-1 text-muted-foreground">
              Check-in draft prepared · 14+ days
            </span>
          </TileRow>
        </div>
      </div>
      <div className="flex h-10 items-end gap-1.5">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: APPLE_EASE, delay: 0.1 + i * 0.05 }}
            className="flex-1 rounded-sm bg-sky/40"
          />
        ))}
      </div>
    </div>
  );
}

export function GoalsRoadmapVisual() {
  const reduce = useReducedMotion();
  const steps = [
    { phase: "Now", label: "5 active clients", done: true, play: null as string | null },
    { phase: "Next", label: "Standardize onboarding", done: false, play: "Onboarding kickoff" },
    { phase: "Then", label: "Raise positioning", done: false, play: "Scope template" },
  ];
  return (
    <div className={cn(TILE_VISUAL, "flex flex-col justify-end")}>
      <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-background px-1">
        {steps.map((step, i) => (
          <motion.div
            key={step.phase}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: APPLE_EASE, delay: 0.06 + i * 0.08 }}
            className="flex gap-2.5 px-2 py-2.5"
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-foreground text-background" : "border border-foreground/25",
              )}
            >
              {step.done && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {step.phase}
              </p>
              <p className="text-[12px] font-medium leading-snug">{step.label}</p>
              {step.play && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{step.play} · prepared</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const CONNECT_GRID_COLS = 5;

/** Famous brands first; fill extra rows from the full Composio set when space allows. */
const CONNECT_GRID_POOL = [
  ...FAMOUS_COMPOSIO_BRANDS,
  ...COMPOSIO_BRANDS.filter((b) => !FAMOUS_COMPOSIO_BRANDS.some((f) => f.slug === b.slug)),
];

function connectGridRowsForHeight(height: number, width: number) {
  const sm = width >= 640;
  const cell = sm ? 40 : 36;
  const rowGap = sm ? 12 : 10;
  const maxRows = Math.ceil(CONNECT_GRID_POOL.length / CONNECT_GRID_COLS);
  let rows = 1;

  for (let r = 1; r <= maxRows; r++) {
    const blockHeight = r * cell + (r - 1) * rowGap;
    if (blockHeight <= height) rows = r;
    else break;
  }

  return rows;
}

export function ConnectToolsPickVisual() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(2);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setRowCount(connectGridRowsForHeight(el.clientHeight, el.clientWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visibleIcons = CONNECT_GRID_POOL.slice(0, rowCount * CONNECT_GRID_COLS);

  return (
    <div
      ref={containerRef}
      className={cn(TILE_VISUAL, "flex h-full min-h-0 flex-col items-center justify-center")}
    >
      <div className="mx-auto grid w-max max-w-full grid-cols-5 justify-items-center gap-x-1.5 gap-y-2.5 sm:gap-x-2 sm:gap-y-3">
        {visibleIcons.map(({ Icon, color, slug, label }, i) => (
          <motion.div
            key={slug}
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: APPLE_EASE, delay: Math.min(0.04 + i * 0.015, 0.45) }}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-background sm:size-10 sm:rounded-xl"
            title={label}
          >
            <Icon className={cn("block size-4 sm:size-[18px]", color)} aria-hidden />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ProofStatsVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-2 gap-4">
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        className="rounded-2xl border border-foreground/10 bg-muted/40 p-5 text-center"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Morning review
        </p>
        <div className="mt-3 flex items-baseline justify-center gap-2">
          <motion.span
            initial={reduce ? false : { opacity: 0.3 }}
            whileInView={{ opacity: 0.35 }}
            className="font-display text-3xl line-through decoration-foreground/30"
          >
            90m
          </motion.span>
          <motion.span
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
            className="font-display text-4xl text-flame"
          >
            15m
          </motion.span>
        </div>
      </motion.div>
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        className="rounded-2xl border border-foreground/10 bg-muted/40 p-5 text-center"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          New clients / mo
        </p>
        <div className="mt-3 flex items-baseline justify-center gap-2">
          <motion.span
            initial={reduce ? false : { opacity: 0.3 }}
            whileInView={{ opacity: 0.35 }}
            className="font-display text-3xl line-through decoration-foreground/30"
          >
            1
          </motion.span>
          <motion.span
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45, type: "spring", stiffness: 300, damping: 20 }}
            className="font-display text-4xl text-sky"
          >
            5
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}
