"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap,
  X,
  ChevronDown,
  Sparkles,
  Workflow,
  Target,
  ArrowRight,
  MinusCircle,
  AlertCircle,
  Link2,
} from "lucide-react";
import {
  CAPTURE_STREAM,
  ORIGIN_META,
  type CaptureStatus,
  type StreamEntry,
} from "@/app/_lib/demo/capture-demo-data";
import type { StreamCaptureSummary, CaptureIntelligenceOutcome } from "../types";
import {
  INTELLIGENCE_OUTCOME_DETAIL,
  INTELLIGENCE_OUTCOME_LABELS,
} from "../services/intelligence/capture-intelligence-outcome";
import { getSourceMeta } from "../source-taxonomy";
import { SourceExternalLink } from "./SourceExternalLink";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import {
  CaptureStreamFilterPopover,
  type StreamStatusFilter,
  type StreamIntelligenceFilter,
  type StreamSourceFilter,
  type StreamDateFilter,
} from "./CaptureFilterPopover";
import { cn } from "@repo/utils";

interface CaptureStreamTabProps {
  realStreamCaptures?: StreamCaptureSummary[];
  realStats?: {
    total: number;
    added: number;
    found: number;
    autoRouted: number;
    pending: number;
    findingCreated?: number;
    noSignal?: number;
    awaitingScan?: number;
    scanError?: number;
  } | null;
  hasRealData?: boolean;
}

type RealStreamEntry = StreamEntry & {
  intelligenceOutcome?: CaptureIntelligenceOutcome;
  sourceUrl?: string | null;
};

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const INTELLIGENCE_STATUS_STYLES: Record<
  CaptureIntelligenceOutcome,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  awaiting_scan: {
    label: INTELLIGENCE_OUTCOME_LABELS.awaiting_scan,
    cls: "bg-flame/15 text-flame",
    icon: Clock,
  },
  no_signal: {
    label: INTELLIGENCE_OUTCOME_LABELS.no_signal,
    cls: "bg-muted text-muted-foreground",
    icon: MinusCircle,
  },
  finding_created: {
    label: INTELLIGENCE_OUTCOME_LABELS.finding_created,
    cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    icon: Link2,
  },
  scan_error: {
    label: INTELLIGENCE_OUTCOME_LABELS.scan_error,
    cls: "bg-destructive/10 text-destructive",
    icon: AlertCircle,
  },
  routed: {
    label: INTELLIGENCE_OUTCOME_LABELS.routed,
    cls: "bg-sky/15 text-sky",
    icon: CheckCircle2,
  },
  dismissed: {
    label: INTELLIGENCE_OUTCOME_LABELS.dismissed,
    cls: "bg-muted text-muted-foreground",
    icon: X,
  },
};

function intelligenceOutcomeDetail(
  outcome: CaptureIntelligenceOutcome,
  findingId?: string | null
): string {
  if (outcome === "finding_created" && findingId) {
    return "Linked to a Plays finding — check Queue";
  }
  return INTELLIGENCE_OUTCOME_DETAIL[outcome];
}

const STATUS_STYLES: Record<
  CaptureStatus,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  "auto-routed": {
    label: "Auto-routed",
    cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    icon: Zap,
  },
  pending: { label: "Pending", cls: "bg-flame/15 text-flame", icon: Clock },
  confirmed: { label: "Confirmed", cls: "bg-sky/15 text-sky", icon: CheckCircle2 },
  dismissed: { label: "Dismissed", cls: "bg-muted text-muted-foreground", icon: X },
};

export function CaptureStreamTab({
  realStreamCaptures = [],
  realStats = null,
  hasRealData = false,
}: CaptureStreamTabProps = {}) {
  const mockContent = useMockContent();

  // Convert real captures to stream entries format for display
  const realStreamEntries: RealStreamEntry[] = useMemo(() => {
    if (!hasRealData || realStreamCaptures.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    return realStreamCaptures.map((c) => {
      const createdAt = new Date(c.created_at);
      let dayGroup: StreamEntry["dayGroup"] = "Earlier this week";
      if (createdAt >= today) dayGroup = "Today";
      else if (createdAt >= yesterday) dayGroup = "Yesterday";

      const sourceMeta = getSourceMeta(c.source_type);
      const outcome = c.intelligence_outcome;
      const detail = intelligenceOutcomeDetail(outcome, c.finding_id);

      let status: CaptureStatus = "pending";
      if (outcome === "finding_created" || outcome === "routed") status = "confirmed";
      else if (outcome === "dismissed") status = "dismissed";
      else if (outcome === "no_signal") status = "auto-routed";

      return {
        id: c.capture_id,
        dayGroup,
        time: createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        source: c.origin,
        origin: c.source_type as StreamEntry["origin"],
        status,
        snippet: c.title || "Untitled capture",
        routedTo: INTELLIGENCE_OUTCOME_LABELS[outcome],
        trigger: `From ${sourceMeta.label}`,
        sources: [sourceMeta.label],
        learned: detail,
        intelligenceOutcome: outcome,
        sourceUrl: c.source_url ?? null,
      };
    });
  }, [realStreamCaptures, hasRealData]);

  // Use real data if available, fall back to demo data if mock content is enabled
  const stream = hasRealData && realStreamCaptures.length > 0
    ? realStreamEntries
    : mockContent
      ? CAPTURE_STREAM
      : [];

  const [q, setQ] = useState("");
  const [source, setSource] = useState<StreamSourceFilter>("all");
  const [status, setStatus] = useState<StreamStatusFilter>("all");
  const [intelligenceStatus, setIntelligenceStatus] =
    useState<StreamIntelligenceFilter>("all");
  const [date, setDate] = useState<StreamDateFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const useIntelligenceFilters = hasRealData && realStreamCaptures.length > 0;

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const entries = useMemo(() => {
    const term = q.trim().toLowerCase();
    return stream
      .filter((e) => {
        if (useIntelligenceFilters && "intelligenceOutcome" in e) {
          const outcome = (e as RealStreamEntry).intelligenceOutcome;
          if (intelligenceStatus !== "all" && outcome !== intelligenceStatus) {
            return false;
          }
          return true;
        }
        return status === "all" ? true : e.status === status;
      })
      .filter((e) => (source === "all" ? true : e.source === source))
      .filter((e) => (date === "all" ? true : e.dayGroup === date))
      .filter((e) =>
        !term ? true : e.snippet.toLowerCase().includes(term) || e.routedTo.toLowerCase().includes(term)
      );
  }, [q, status, intelligenceStatus, source, date, stream, useIntelligenceFilters]);

  const grouped = useMemo(() => {
    const map = new Map<string, StreamEntry[]>();
    entries.forEach((e) => {
      const arr = map.get(e.dayGroup) ?? [];
      arr.push(e);
      map.set(e.dayGroup, arr);
    });
    return Array.from(map.entries());
  }, [entries]);

  const counts = useMemo(() => {
    if (hasRealData && realStats) {
      if (useIntelligenceFilters) {
        return {
          added: realStats.added,
          found: realStats.found,
          finding: realStats.findingCreated ?? 0,
          noSignal: realStats.noSignal ?? 0,
          awaiting: realStats.awaitingScan ?? 0,
          total: realStats.total,
        };
      }
      return {
        added: realStats.added,
        found: realStats.found,
        auto: realStats.autoRouted,
        pending: realStats.pending,
        total: realStats.total,
      };
    }

    const today = stream.filter((e) => e.dayGroup === "Today");
    return {
      added: today.filter((e) => e.source === "added").length,
      found: today.filter((e) => e.source === "found").length,
      auto: today.filter((e) => e.status === "auto-routed").length,
      pending: today.filter((e) => e.status === "pending").length,
      total: today.length,
    };
  }, [stream, hasRealData, realStats, useIntelligenceFilters]);

  // Show empty state only if we have no real data AND mock content is disabled
  if (!hasRealData && !mockContent) {
    return (
      <MockContentEmptyState
        title="No capture history yet"
        description="Connect Gmail or another tool to start capturing context automatically."
      />
    );
  }

  // Show empty state if mock content is disabled and real data is empty
  if (hasRealData && realStreamCaptures.length === 0 && !mockContent) {
    return (
      <MockContentEmptyState
        title="No capture history yet"
        description="Connect Gmail or another tool to start capturing context automatically."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-5"
    >
      <section className="glass-card rounded-3xl p-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Today&apos;s capture ledger
            </p>
            <h3 className="mt-0.5 font-display text-lg tracking-tight">
              {counts.total} captures today
            </h3>
          </div>
          <p className="hidden max-w-[280px] text-right text-[11px] text-muted-foreground md:block">
            {useIntelligenceFilters
              ? "Scan outcome per capture — findings live in Queue."
              : "Click any row to see the trigger, sources, and where Salt routed it."}
          </p>
        </header>
        {useIntelligenceFilters ? (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            <CountTile label="Added" value={counts.added ?? 0} tone="violet" />
            <CountTile label="Found" value={counts.found ?? 0} tone="sky" />
            <CountTile label="Finding" value={"finding" in counts ? (counts.finding ?? 0) : 0} tone="emerald" />
            <CountTile label="No signal" value={"noSignal" in counts ? (counts.noSignal ?? 0) : 0} tone="muted" />
            <CountTile label="Awaiting scan" value={"awaiting" in counts ? (counts.awaiting ?? 0) : 0} tone="flame" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <CountTile label="Added" value={counts.added ?? 0} tone="violet" />
            <CountTile label="Found" value={counts.found ?? 0} tone="sky" />
            <CountTile label="Auto-routed" value={"auto" in counts ? (counts.auto ?? 0) : 0} tone="emerald" />
            <CountTile label="Pending" value={"pending" in counts ? (counts.pending ?? 0) : 0} tone="flame" />
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search captures…"
            className="h-9 w-full rounded-full border border-border/60 bg-card pl-10 pr-4 text-sm transition hover:border-border focus:outline-none focus:ring-4 focus:ring-foreground/5"
          />
        </div>
        <div className="ml-auto">
          <CaptureStreamFilterPopover
            source={source}
            onSource={setSource}
            status={status}
            onStatus={setStatus}
            intelligenceStatus={intelligenceStatus}
            onIntelligenceStatus={setIntelligenceStatus}
            useIntelligenceFilters={useIntelligenceFilters}
            date={date}
            onDate={setDate}
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-2xl tracking-tight">No matching captures</p>
          <p className="mt-1 text-sm text-muted-foreground">Adjust the filters or search.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <header className="flex items-center gap-3 px-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {day}
                </p>
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </header>
              <ul className="glass-card divide-y divide-border/40 overflow-hidden rounded-3xl">
                {items.map((e) => {
                  const origin = ORIGIN_META[e.origin];
                  const OriginIcon = origin.icon;
                  const realEntry = e as RealStreamEntry;
                  const sx =
                    useIntelligenceFilters && realEntry.intelligenceOutcome
                      ? INTELLIGENCE_STATUS_STYLES[realEntry.intelligenceOutcome]
                      : STATUS_STYLES[e.status];
                  const StatusIcon = sx.icon;
                  const isOpen = expanded.has(e.id);
                  const canUndo =
                    !useIntelligenceFilters &&
                    (e.status === "auto-routed" || e.status === "confirmed");

                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(e.id)}
                        aria-expanded={isOpen}
                        className="grid w-full grid-cols-[32px_72px_36px_1fr_auto_20px] items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40"
                      >
                        <span className="flex items-center justify-center">
                          {canUndo ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(ev) => ev.stopPropagation()}
                              onKeyDown={(ev) => ev.stopPropagation()}
                              className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              title="Undo"
                              aria-label="Undo"
                            >
                              <RotateCcw className="size-3.5" strokeWidth={2.25} />
                            </span>
                          ) : null}
                        </span>
                        <span className="truncate text-[11px] font-medium tabular-nums text-muted-foreground">
                          {e.time}
                        </span>
                        <span
                          className={cn(
                            "grid size-8 place-items-center rounded-xl",
                            e.source === "added" ? "bg-violet/15 text-violet" : "bg-sky/15 text-sky"
                          )}
                          title={origin.label}
                        >
                          <OriginIcon className="size-3.5" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium leading-tight">
                            {e.snippet}
                          </p>
                          <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 truncate text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-[0.08em]">
                              {e.source}
                            </span>
                            <span>·</span>
                            <span>{origin.label}</span>
                            <span>·</span>
                            <ArrowRight className="size-3" strokeWidth={2} />
                            <span className="font-medium">{e.routedTo}</span>
                            {realEntry.sourceUrl ? (
                              <>
                                <span>·</span>
                                <SourceExternalLink
                                  href={realEntry.sourceUrl}
                                  className="inline-flex shrink-0"
                                  onClick={(ev) => ev.stopPropagation()}
                                />
                              </>
                            ) : null}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            sx.cls
                          )}
                        >
                          <StatusIcon className="size-3" strokeWidth={2.5} />
                          {sx.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform duration-300",
                            isOpen && "rotate-180 text-foreground"
                          )}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: APPLE_EASE }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3.5 px-4 pb-5 pl-[104px] pr-6 pt-1">
                              <DetailRow icon={Target} label="Trigger" value={e.trigger ?? "—"} />
                              <DetailRow
                                icon={Workflow}
                                label="Sources used"
                                value={
                                  e.sources && e.sources.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {e.sources.map((s) => (
                                        <span
                                          key={s}
                                          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80"
                                        >
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    "—"
                                  )
                                }
                              />
                              <DetailRow icon={ArrowRight} label="Scan outcome" value={e.routedTo} />
                              {realEntry.sourceUrl ? (
                                <DetailRow
                                  icon={Link2}
                                  label="Source email"
                                  value={
                                    <SourceExternalLink href={realEntry.sourceUrl} />
                                  }
                                />
                              ) : null}
                              <DetailRow
                                icon={Sparkles}
                                label="What Salt learned"
                                value={e.learned ?? "Nothing yet — still pending."}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[20px_120px_1fr] items-start gap-3">
      <Icon className="mt-0.5 size-3.5 text-muted-foreground" strokeWidth={2} />
      <p className="pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="text-[12.5px] leading-relaxed text-foreground/85">{value}</div>
    </div>
  );
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "flame" | "sky" | "violet" | "muted";
}) {
  const cls = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    flame: "bg-flame/15 text-flame",
    sky: "bg-sky/15 text-sky",
    violet: "bg-violet/15 text-violet",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div className={cn("flex items-baseline justify-between gap-2 rounded-2xl p-3.5", cls)}>
      <p className="font-display text-2xl leading-none tabular-nums tracking-tight">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-80">{label}</p>
    </div>
  );
}
