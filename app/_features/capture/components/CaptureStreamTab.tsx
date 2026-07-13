"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { retryCaptureIntelligence } from "../actions/retry-capture";
import {
  CheckCircle2,
  Clock,
  Zap,
  X,
  ChevronDown,
  Sparkles,
  ArrowRight,
  MinusCircle,
  AlertTriangle,
  Link2,
  RefreshCw,
  User,
} from "lucide-react";
import {
  CAPTURE_STREAM,
  ORIGIN_META,
  type CaptureStatus,
  type StreamEntry,
} from "@/app/_lib/demo/capture-demo-data";
import type { StreamCaptureSummary, CaptureIntelligenceOutcome } from "../types";
import {
  type CaptureCategory,
  mapOutcomeToCategory,
  CAPTURE_CATEGORY_LABELS,
  CAPTURE_CATEGORY_DETAIL,
} from "../services/intelligence/capture-intelligence-outcome";
import { getSourceMeta, SOURCE_TAXONOMY } from "../source-taxonomy";
import type { CaptureSourceType, SourceCategory } from "../types";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import { connectorForToolkit } from "@/app/_features/connectors/utils/toolkit-connector";
import { SourceExternalLink } from "./SourceExternalLink";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  CaptureStreamFilterContent,
  countCaptureStreamFilters,
  type StreamStatusFilter,
  type StreamCategoryFilter,
  type StreamSourceFilter,
  type StreamDateFilter,
} from "./CaptureFilterPopover";
import { PlaysSearchField } from "@/app/_features/plays/components/PlaysSearchField";
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
  category: CaptureCategory;
  sourceUrl?: string | null;
  from?: string;
  subject?: string;
  contentSnippet?: string;
  findingId?: string | null;
  noSignalReason?: string;
};

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const CATEGORY_STYLES: Record<
  CaptureCategory,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  queued: {
    label: "Queued",
    cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    icon: Link2,
  },
  "no-signal": {
    label: "No Signal",
    cls: "bg-muted text-muted-foreground",
    icon: MinusCircle,
  },
  processing: {
    label: "Processing",
    cls: "bg-flame/15 text-flame",
    icon: Clock,
  },
  error: {
    label: "Error",
    cls: "bg-destructive/10 text-destructive",
    icon: AlertTriangle,
  },
};

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

  // Convert real captures to stream entries format with new categories
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
      const category = mapOutcomeToCategory(outcome);

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
        category,
        snippet: c.title || "Untitled capture",
        routedTo: CAPTURE_CATEGORY_LABELS[category],
        trigger: `From ${sourceMeta.label}`,
        sources: [sourceMeta.label],
        learned: CAPTURE_CATEGORY_DETAIL[category],
        intelligenceOutcome: outcome,
        sourceUrl: c.source_url ?? null,
        from: c.from_label ?? undefined,
        subject: c.title ?? undefined,
        contentSnippet: c.body_preview ?? undefined,
        findingId: c.finding_id ?? null,
        noSignalReason: outcome === "no_signal" ? "Nothing actionable found" : undefined,
      };
    });
  }, [realStreamCaptures, hasRealData]);

  // For demo data, add category mapping
  const demoStreamWithCategories: RealStreamEntry[] = useMemo(() => {
    if (!mockContent) return [];
    return CAPTURE_STREAM.map((e) => ({
      ...e,
      category: e.status === "auto-routed" ? "no-signal" as CaptureCategory :
                e.status === "pending" ? "processing" as CaptureCategory :
                e.status === "confirmed" ? "queued" as CaptureCategory :
                "no-signal" as CaptureCategory,
    }));
  }, [mockContent]);

  // Use real data if available, fall back to demo data if mock content is enabled
  const stream = hasRealData && realStreamCaptures.length > 0
    ? realStreamEntries
    : demoStreamWithCategories;

  const useCategoryFilters = hasRealData && realStreamCaptures.length > 0;

  const [q, setQ] = useState("");
  const [source, setSource] = useState<StreamSourceFilter>("all");
  const [status, setStatus] = useState<StreamStatusFilter>("all");
  const [category, setCategory] = useState<StreamCategoryFilter>("all");
  const [date, setDate] = useState<StreamDateFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRetry = useCallback((captureId: string) => {
    setRetryingId(captureId);
    startTransition(async () => {
      const result = await retryCaptureIntelligence(captureId);
      setRetryingId(null);
      if (!result.success) {
        console.error("[CaptureStreamTab] Retry failed:", result.error);
      }
    });
  }, []);

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
        if (useCategoryFilters) {
          return category === "all" ? true : e.category === category;
        }
        return status === "all" ? true : e.status === status;
      })
      .filter((e) => (source === "all" ? true : e.source === source))
      .filter((e) => (date === "all" ? true : e.dayGroup === date))
      .filter((e) =>
        !term ? true : e.snippet.toLowerCase().includes(term) || e.routedTo.toLowerCase().includes(term)
      );
  }, [q, status, category, source, date, stream, useCategoryFilters]);

  const grouped = useMemo(() => {
    const map = new Map<string, RealStreamEntry[]>();
    entries.forEach((e) => {
      const arr = map.get(e.dayGroup) ?? [];
      arr.push(e);
      map.set(e.dayGroup, arr);
    });
    return Array.from(map.entries());
  }, [entries]);

  const counts = useMemo(() => {
    if (hasRealData && realStats) {
      return {
        queued: realStats.findingCreated ?? 0,
        noSignal: realStats.noSignal ?? 0,
        processing: realStats.awaitingScan ?? 0,
        error: realStats.scanError ?? 0,
        total: realStats.total,
      };
    }

    const today = stream.filter((e) => e.dayGroup === "Today");
    return {
      queued: today.filter((e) => e.category === "queued").length,
      noSignal: today.filter((e) => e.category === "no-signal").length,
      processing: today.filter((e) => e.category === "processing").length,
      error: today.filter((e) => e.category === "error").length,
      total: today.length,
    };
  }, [stream, hasRealData, realStats]);

  const activeFilterCount = countCaptureStreamFilters({
    source,
    status,
    category,
    useIntelligenceFilters: false,
    useCategoryFilters,
    date,
  });

  const hasActiveSearchOrFilter = q.trim().length > 0 || activeFilterCount > 0;
  const isEmptyDataset = stream.length === 0;

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
              Today&apos;s captures
            </p>
            <h3 className="mt-0.5 font-display text-lg tracking-tight">
              {counts.total} captures today
            </h3>
          </div>
          <p className="hidden max-w-[280px] text-right text-[11px] text-muted-foreground md:block">
            Everything Salt saw from connected apps.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <CountTile label="Queued" value={counts.queued} tone="emerald" />
          <CountTile label="No Signal" value={counts.noSignal} tone="muted" />
          <CountTile label="Processing" value={counts.processing} tone="flame" />
          <CountTile label="Error" value={counts.error} tone="destructive" />
        </div>
      </section>

      <PlaysSearchField
        value={q}
        onChange={setQ}
        placeholder="Search captures…"
        filterActive={activeFilterCount > 0}
        filterActiveCount={activeFilterCount}
        filterContent={
          <CaptureStreamFilterContent
            source={source}
            onSource={setSource}
            status={status}
            onStatus={setStatus}
            category={category}
            onCategory={setCategory}
            useCategoryFilters={useCategoryFilters}
            date={date}
            onDate={setDate}
          />
        }
      />

      {grouped.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-2xl tracking-tight">
            {isEmptyDataset && !hasActiveSearchOrFilter
              ? "No captures yet"
              : "No matching captures"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEmptyDataset && !hasActiveSearchOrFilter
              ? "Connect Gmail or another tool to start capturing context automatically."
              : "Adjust the filters or search."}
          </p>
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
                {items.map((e) => (
                  <CaptureRow
                    key={e.id}
                    entry={e}
                    isOpen={expanded.has(e.id)}
                    onToggle={() => toggleExpand(e.id)}
                    useCategoryDisplay={useCategoryFilters}
                    onRetry={handleRetry}
                    isRetrying={retryingId === e.id}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CaptureRow({
  entry: e,
  isOpen,
  onToggle,
  useCategoryDisplay,
  onRetry,
  isRetrying,
}: {
  entry: RealStreamEntry;
  isOpen: boolean;
  onToggle: () => void;
  useCategoryDisplay: boolean;
  onRetry: (id: string) => void;
  isRetrying: boolean;
}) {
  const sourceMeta = resolveEntrySourceMeta(e);
  const categoryStyle = CATEGORY_STYLES[e.category];
  const statusStyle = STATUS_STYLES[e.status];
  const displayStyle = useCategoryDisplay ? categoryStyle : statusStyle;
  const StatusIcon = displayStyle.icon;
  const isUserAdded = e.source === "added";

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="grid w-full grid-cols-[72px_36px_1fr_auto_20px] items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40"
      >
        <span className="truncate text-[11px] font-medium tabular-nums text-muted-foreground">
          {e.time}
        </span>
        {isUserAdded ? (
          <span
            className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-foreground"
            title="You added"
          >
            <User className="size-3.5" strokeWidth={2.25} />
          </span>
        ) : (
          <CaptureSourceIcon entry={e} />
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-tight">
            {e.snippet}
          </p>
          <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 truncate text-[11px] text-muted-foreground">
            {e.from && (
              <>
                <span>from {e.from}</span>
                <span>·</span>
              </>
            )}
            <span>{sourceMeta.label}</span>
            {e.sourceUrl ? (
              <>
                <span>·</span>
                <SourceExternalLink
                  href={e.sourceUrl}
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
            displayStyle.cls
          )}
        >
          <StatusIcon className="size-3" strokeWidth={2.5} />
          {displayStyle.label}
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
            <CaptureCardDetail entry={e} onRetry={onRetry} isRetrying={isRetrying} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function CaptureSourceIcon({ entry }: { entry: RealStreamEntry }) {
  const connector = connectorForToolkit(entry.origin);
  if (connector) {
    return (
      <span
        className="grid size-8 shrink-0 place-items-center rounded-xl border border-border/50 bg-card shadow-sm"
        title={connector.label}
      >
        <ConnectorIcon id={connector.id} size={18} />
      </span>
    );
  }

  return (
    <span
      className="surface-aurora grid size-8 shrink-0 place-items-center rounded-xl"
      title="Salt found"
    >
      <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
    </span>
  );
}

function resolveEntrySourceMeta(entry: RealStreamEntry) {
  const origin = entry.origin as string;
  if (origin in SOURCE_TAXONOMY) {
    return getSourceMeta(origin as CaptureSourceType);
  }
  const legacy = ORIGIN_META[entry.origin as keyof typeof ORIGIN_META];
  if (legacy) {
    return { label: legacy.label, icon: legacy.icon, category: "manual" as SourceCategory };
  }
  return { label: origin, icon: Sparkles, category: "manual" as SourceCategory };
}

function CaptureCardDetail({
  entry: e,
  onRetry,
  isRetrying,
}: {
  entry: RealStreamEntry;
  onRetry: (id: string) => void;
  isRetrying: boolean;
}) {
  const sourceMeta = resolveEntrySourceMeta(e);
  const hasMeta = Boolean(e.from || e.sourceUrl);
  const hasPreview = Boolean(e.contentSnippet);

  if (!hasMeta && !hasPreview) {
    return (
      <div className="px-4 pb-5 pt-0 pl-[calc(1rem+7.5rem+0.75rem)] pr-6">
        <CaptureOutcomePanel entry={e} onRetry={onRetry} isRetrying={isRetrying} />
      </div>
    );
  }

  return (
    <div className="px-4 pb-5 pt-0 pl-[calc(1rem+7.5rem+0.75rem)] pr-6">
      <div className="min-w-0 space-y-3">
        {hasMeta && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-muted-foreground">
            {e.from && <span>from {e.from}</span>}
            {e.from && e.sourceUrl && <span aria-hidden>·</span>}
            {e.sourceUrl && (
              <SourceExternalLink
                href={e.sourceUrl}
                label={`Open in ${sourceMeta.label}`}
              />
            )}
          </div>
        )}

        {hasPreview && (
          <div className="rounded-xl border border-border/40 bg-muted/25 px-3.5 py-2.5">
            <p className="text-[12px] leading-relaxed text-foreground/80 line-clamp-4">
              {e.contentSnippet}
            </p>
          </div>
        )}

        <CaptureOutcomePanel entry={e} onRetry={onRetry} isRetrying={isRetrying} />
      </div>
    </div>
  );
}

function CaptureOutcomePanel({
  entry: e,
  onRetry,
  isRetrying,
}: {
  entry: RealStreamEntry;
  onRetry: (id: string) => void;
  isRetrying: boolean;
}) {
  if (e.category === "queued") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300">
            {CAPTURE_CATEGORY_DETAIL.queued}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Salt found something worth your review.
          </p>
        </div>
        <Link
          href={e.findingId ? `/plays?tab=queue&finding=${e.findingId}` : "/plays?tab=queue"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition hover:border-border hover:text-foreground"
        >
          View in Queue
          <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  if (e.category === "no-signal") {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/25 px-3.5 py-3">
        <p className="text-[12px] font-medium text-foreground/85">
          {CAPTURE_CATEGORY_DETAIL["no-signal"]}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {e.noSignalReason ?? "Nothing actionable found in this capture."}
        </p>
      </div>
    );
  }

  if (e.category === "processing") {
    return (
      <div className="rounded-xl border border-flame/20 bg-flame/5 px-3.5 py-3">
        <p className="text-[12px] font-medium text-flame">
          {CAPTURE_CATEGORY_DETAIL.processing}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Salt is looking for people, projects, and follow-ups. This usually takes a few minutes.
        </p>
      </div>
    );
  }

  if (e.category === "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-destructive">
            {CAPTURE_CATEGORY_DETAIL.error}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Something went wrong during analysis. You can try again.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRetry(e.id)}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition hover:border-border hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  return null;
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "flame" | "sky" | "violet" | "muted" | "destructive";
}) {
  const cls = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    flame: "bg-flame/15 text-flame",
    sky: "bg-sky/15 text-sky",
    violet: "bg-violet/15 text-violet",
    muted: "bg-muted text-muted-foreground",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className={cn("rounded-2xl p-3.5 flex items-baseline justify-between gap-2", cls)}>
      <p className="font-display text-2xl tracking-tight tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold opacity-80">
        {label}
      </p>
    </div>
  );
}
