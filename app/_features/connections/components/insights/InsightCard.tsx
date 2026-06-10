"use client";

import {
  AlertTriangle,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Clock,
  Mail,
  FileText,
  Calendar,
  CreditCard,
  StickyNote,
  MessageSquare,
  Briefcase,
  MoreHorizontal,
  Check,
  X,
  RotateCcw,
  Slash,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  CATEGORY_META,
  type Evidence,
  type EvidenceKind,
  type Insight,
} from "@/app/_lib/demo/connections-insights-data";

const CATEGORY_ICON: Record<Insight["category"], typeof Sparkles> = {
  risk: AlertTriangle,
  opportunity: Sparkles,
  missing_context: HelpCircle,
  warm_path: ArrowRight,
  stale: Clock,
};

const EVIDENCE_ICON: Record<EvidenceKind, typeof Mail> = {
  message: Mail,
  file: FileText,
  meeting: Calendar,
  payment: CreditCard,
  note: StickyNote,
  thread: MessageSquare,
  deal: Briefcase,
};

const SEVERITY_DOT: Record<Insight["severity"], string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-flame",
  high: "bg-destructive",
};

function EvidenceRow({ ev }: { ev: Evidence }) {
  const Icon = EVIDENCE_ICON[ev.kind];
  const sourceLabel =
    ev.source === "user" ? "You" : ev.source === "imported" ? "Imported" : "Salt";
  const sourceTone =
    ev.source === "salt_inferred"
      ? "text-flame bg-flame/10 border-flame/30"
      : "text-foreground/70 bg-muted border-border/60";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
      <span className="size-7 rounded-lg bg-card border border-border/60 grid place-items-center shrink-0">
        <Icon className="size-3.5 text-foreground/70" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground leading-snug truncate">{ev.label}</p>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">
          {ev.detail}
        </p>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shrink-0",
          sourceTone,
        )}
      >
        {ev.source === "salt_inferred" && <Sparkles className="size-2.5" strokeWidth={2.25} />}
        {sourceLabel}
      </span>
    </div>
  );
}

export function InsightCard({ insight }: { insight: Insight }) {
  const meta = CATEGORY_META[insight.category];
  const Icon = CATEGORY_ICON[insight.category];
  const [menuOpen, setMenuOpen] = useState(false);

  function handleAction() {
    const labels: Record<Insight["nextAction"]["kind"], string> = {
      outreach: "Drafting outreach…",
      play: "Routing to Plays…",
      ask_salt: "Opening Ask Salt…",
      open_record: "Opening record…",
    };
    toast.success(labels[insight.nextAction.kind]);
  }

  function correction(action: string) {
    setMenuOpen(false);
    toast(`We'll remember this — wiring coming soon (${action})`);
  }

  return (
    <article
      className={cn(
        "group relative rounded-3xl border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)] flex flex-col gap-4",
        meta.ring,
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "size-9 rounded-full grid place-items-center shrink-0 border",
            meta.tone,
          )}
        >
          <Icon className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                meta.tone,
              )}
            >
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[insight.severity])} />
              {insight.severity}
            </span>
          </div>
          <h3 className="mt-2 font-display text-[17px] leading-snug tracking-tight text-foreground">
            {insight.claim}
          </h3>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="size-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Correction menu"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-56 rounded-2xl border border-border bg-popover shadow-lg p-1.5 text-sm">
              <button
                onClick={() => correction("Mark wrong")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-left"
              >
                <X className="size-3.5 text-destructive" /> Mark wrong
              </button>
              <button
                onClick={() => correction("Not important")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-left"
              >
                <Slash className="size-3.5 text-muted-foreground" /> Not important
              </button>
              <button
                onClick={() => correction("Useful, do this again")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-left"
              >
                <Check className="size-3.5 text-emerald-600" /> Useful, do this again
              </button>
              <button
                onClick={() => correction("Don't use this source")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-left"
              >
                <RotateCcw className="size-3.5 text-muted-foreground" /> Don't use this source
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Evidence */}
      <div className="space-y-1.5">
        {insight.evidence.map((ev, i) => (
          <EvidenceRow key={i} ev={ev} />
        ))}
      </div>

      {/* Why it matters */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        <span className="text-foreground/80 font-medium">Why it matters · </span>
        {insight.whyItMatters}
      </p>

      {/* Confidence + freshness */}
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3 text-flame" strokeWidth={2.25} />
          <span className="font-medium text-foreground/70">{insight.confidence}</span>
          {insight.patternCount ? (
            <span className="text-muted-foreground">· {insight.patternCount} sources</span>
          ) : null}
        </span>
        <span aria-hidden>·</span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            insight.isStale && "text-destructive",
          )}
        >
          <Clock className="size-3" />
          {insight.freshness}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
        <button
          onClick={handleAction}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition"
        >
          {insight.nextAction.label}
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-2">
          {insight.route && (
            <button
              onClick={() => toast(`Routing to ${insight.route!.label}`)}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              {insight.route.label} →
            </button>
          )}
          <button
            onClick={() => toast("Opening Ask Salt with this insight as context")}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition"
          >
            <Sparkles className="size-3" strokeWidth={2.25} />
            Ask Salt
          </button>
        </div>
      </div>
    </article>
  );
}
