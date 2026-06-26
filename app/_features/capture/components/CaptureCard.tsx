"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Pencil,
  ArrowRight,
  Inbox,
  Workflow,
  Users,
  Brain,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { playerById, TONE_SOFT } from "@/app/_lib/demo/plays-demo-data";
import { ORIGIN_META, type PendingCapture, type RouteKind } from "@/app/_lib/demo/capture-demo-data";
import { cn } from "@repo/utils";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const ROUTE_ICON: Record<RouteKind, typeof Inbox> = {
  memory: Brain,
  play: Workflow,
  space: Users,
  connection: Inbox,
};

const ROUTE_LABEL: Record<RouteKind, string> = {
  memory: "Save to Memory",
  play: "Route to a Play",
  space: "Route to Work",
  connection: "Update Connection",
};

const ROUTE_KINDS: RouteKind[] = ["memory", "play", "connection"];

const ROUTE_TINT: Record<RouteKind, string> = {
  memory: "bg-violet/15 text-violet",
  play: "bg-flame/15 text-flame",
  space: "bg-sky/15 text-sky",
  connection: "bg-muted text-foreground/70",
};

export function CaptureCard({ capture }: { capture: PendingCapture }) {
  const origin = ORIGIN_META[capture.origin];
  const OriginIcon = origin.icon;
  const player = capture.suggestedPlay ? playerById(capture.suggestedPlay.playerId) : null;
  const PlayerIcon = player?.icon;

  const [routeKind, setRouteKind] = useState<RouteKind>(
    capture.proposedRoute.kind === "space" ? "play" : capture.proposedRoute.kind,
  );
  const RouteIcon = ROUTE_ICON[routeKind];
  const isOriginalKind = routeKind === capture.proposedRoute.kind;

  const [openReason, setOpenReason] = useState(true);
  const [openContext, setOpenContext] = useState(false);

  return (
    <motion.article
      key={capture.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="glass-card focus-card rounded-3xl p-6 lg:p-7"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-muted">
            <OriginIcon className="size-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">
                Captured from {origin.label}
              </span>
              <span
                className={cn(
                  "chip",
                  capture.source === "added" ? "bg-violet/15 text-violet" : "bg-sky/15 text-sky"
                )}
              >
                <Sparkles className="size-3" strokeWidth={2.5} />
                {capture.source === "added" ? "Added" : "Found"}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
              {capture.time} · {capture.confidence}% confidence
            </p>
          </div>
        </div>
      </header>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {capture.headline}
        </p>
        <blockquote className="font-display text-2xl leading-snug tracking-tight text-foreground lg:text-3xl">
          &ldquo;{capture.quote}&rdquo;
        </blockquote>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-gradient-to-br from-card to-card/40 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Routing to
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 px-2.5 text-[11px] font-semibold transition hover:border-border hover:bg-muted"
              >
                Change
                <ChevronDown className="size-3" strokeWidth={2.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {ROUTE_KINDS.map((kind) => {
                const Icon = ROUTE_ICON[kind];
                const active = kind === routeKind;
                return (
                  <DropdownMenuItem
                    key={kind}
                    onSelect={() => setRouteKind(kind)}
                    className="cursor-pointer gap-2.5"
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-lg",
                        ROUTE_TINT[kind]
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={2.25} />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">{ROUTE_LABEL[kind]}</span>
                    {active && (
                      <Check className="size-3.5 text-foreground/60" strokeWidth={2.5} />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-start gap-4">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl",
              ROUTE_TINT[routeKind]
            )}
          >
            <RouteIcon className="size-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {ROUTE_LABEL[routeKind]}
            </p>
            <p className="font-display text-lg leading-tight tracking-tight text-foreground lg:text-xl">
              {isOriginalKind ? capture.proposedRoute.label : "Pick a destination"}
            </p>
            {isOriginalKind && capture.proposedRoute.hint && (
              <p className="mt-1 text-[13px] text-muted-foreground">{capture.proposedRoute.hint}</p>
            )}
          </div>
        </div>

        <p className="mt-4 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          Confirm to send · or pick a different destination
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <Disclosure label="Why Salt suggested this" open={openReason} onToggle={() => setOpenReason((o) => !o)}>
          <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">{capture.reasoning}</p>
        </Disclosure>

        {capture.tags.length > 0 && (
          <Disclosure
            label="What Salt used as context"
            open={openContext}
            onToggle={() => setOpenContext((o) => !o)}
          >
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {capture.tags.map((t) => (
                <li key={t} className="chip bg-muted text-foreground/70">
                  {t}
                </li>
              ))}
            </ul>
          </Disclosure>
        )}
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          <Pencil className="size-3 shrink-0" strokeWidth={2} />
          <span className="truncate">
            Confirm to route, change the destination, or add context to sharpen Salt&rsquo;s
            suggestion.
          </span>
        </div>

        {capture.suggestedPlay && player && PlayerIcon && (
          <button
            type="button"
            className="group ml-auto inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background/60 pl-1.5 pr-3 transition hover:border-border hover:bg-muted"
            title={`${capture.suggestedPlay.name} · by ${player.name}`}
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                TONE_SOFT[player.tone]
              )}
            >
              <PlayerIcon className="size-3" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] font-medium text-foreground/80">Follow-up Play:</span>
            <span className="max-w-[180px] truncate text-[11px] font-semibold text-foreground">
              {capture.suggestedPlay.name}
            </span>
            <ArrowRight
              className="size-3 text-muted-foreground transition group-hover:text-foreground"
              strokeWidth={2.25}
            />
          </button>
        )}
      </footer>
    </motion.article>
  );
}

function Disclosure({
  label,
  preview,
  open,
  onToggle,
  children,
}: {
  label: string;
  preview?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onToggle}
      className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3"
    >
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between gap-2 text-left">
          <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
            <Sparkles className="size-3.5 shrink-0 text-flame" strokeWidth={2.25} />
            <span className="shrink-0">{label}</span>
            {preview && !open && (
              <span className="truncate text-[12px] font-normal text-muted-foreground">
                · {preview}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}
