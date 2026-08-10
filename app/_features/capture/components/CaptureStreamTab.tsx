"use client";

import { useEffect, useMemo, useRef, useState, useTransition, useCallback, type MouseEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { retryCaptureIntelligence } from "../actions/retry-capture";
import { getCaptureStreamPageAction } from "../actions/get-capture-stream-page";
import { submitCaptureFeedback, neverCaptureSender } from "../actions/capture-feedback";
import {
  CAPTURE_STREAM_PAGE_SIZES,
  DEFAULT_CAPTURE_STREAM_PAGE_SIZE,
  type CaptureStreamPageSize,
} from "../stream-constants";
import {
  CheckCircle2,
  Clock,
  Zap,
  X,
  ChevronDown,
  Sparkles,
  MinusCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Building2,
  Briefcase,
  CreditCard,
  FileText,
  Calendar,
  MessageSquare,
  Mail,
  ExternalLink,
  Play,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Ban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  CaptureStatus,
  StreamEntry,
  StreamCaptureSummary,
  CaptureIntelligenceOutcome,
  EnrichedCaptureMetadata,
} from "../types";
import {
  type CaptureCategory,
  categoryFromEnrichment,
  CAPTURE_CATEGORY_LABELS,
  CAPTURE_CATEGORY_DETAIL,
} from "../services/intelligence/capture-intelligence-outcome";
import { getSourceMeta, SOURCE_TAXONOMY } from "../source-taxonomy";
import type { CaptureSourceType, SourceCategory } from "../types";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import { connectorForToolkit } from "@/app/_features/connectors/utils/toolkit-connector";
import { SignalBadges } from "./SignalBadges";
import {
  STREAM_AREA_OPTIONS,
  type StreamStateFilter,
  type StreamAreaFilter,
} from "../stream-filters";
import {
  EMPTY_CAPTURE_STREAM_COUNTS,
  type CaptureStreamCounts,
} from "../utils/capture-stream-page-filter";
import { PlaysSearchField } from "@/app/_features/plays/components/PlaysSearchField";
import { ActivityCombinedFilterMenu } from "@/app/_features/plays/components/ActivityCombinedFilterMenu";
import type { ActivityDateRange } from "@/app/_features/plays/components/ActivityDateRangeFilter";
import { dayGroupFromIso } from "@/app/_features/plays/utils/map-play-run-to-activity";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  getPaginationRange,
  toIsoDate,
} from "@repo/ui";
import { toast } from "sonner";
import { cn } from "@repo/utils";

interface CaptureStreamTabProps {
  /** First page of the stream (page 1, default page size), server-rendered. */
  initialCaptures?: StreamCaptureSummary[];
  /** Exact stream-wide row count for numbered pagination. */
  initialTotalCount?: number;
  /** All-time stat-tile counts for the header strip. */
  initialCounts?: CaptureStreamCounts | null;
  hasRealData?: boolean;
}

type PlayDispatchedEntry = {
  play_slug: string;
  play_name: string;
  play_run_id: string;
  state: string;
  dispatched_at: string;
};

type WatchTriggerEntry = {
  entity_id: string;
  entity_label: string;
  surface: string;
  match_type: string;
  matched_value: string | null;
};

// dayGroup widened beyond the demo union: older captures group under
// explicit date labels ("Aug 3") once pagination reaches past last week.
type RealStreamEntry = Omit<StreamEntry, "dayGroup"> & {
  dayGroup: string;
  intelligenceOutcome?: CaptureIntelligenceOutcome;
  category: CaptureCategory;
  sourceUrl?: string | null;
  from?: string;
  subject?: string;
  contentSnippet?: string;
  findingId?: string | null;
  noSignalReason?: string;
  enrichedMetadata?: EnrichedCaptureMetadata | null;
  extractedData?: Record<string, unknown> | null;
  confidence?: number;
  isBootstrap?: boolean;
  playsDispatched?: PlayDispatchedEntry[];
  watchesTriggered?: WatchTriggerEntry[];
  /** Gate outcome — noise rows render demoted (muted, no Salt CTA). */
  gateAction?: string | null;
  gateReason?: string | null;
};

/** Noise = admission gate said noise, or the classifier called it noise. */
function isNoiseEntry(entry: RealStreamEntry): boolean {
  if (entry.gateAction === "noise") return true;
  return Boolean(
    entry.enrichedMetadata?.signals_matched?.includes("email_classified_noise")
  );
}

/** Map a capture summary (stream page or full-history search hit) to a row. */
function toRealStreamEntry(c: StreamCaptureSummary): RealStreamEntry {
  // Shared with Plays Activity: recent days bucket into Today / Yesterday /
  // Earlier this week / Last week; older rows get explicit date labels.
  const dayGroup = dayGroupFromIso(c.created_at);
  const createdAt = new Date(c.created_at);

  const sourceMeta = getSourceMeta(c.source_type);
  const outcome = c.intelligence_outcome;
  // Use enrichment data to determine category when available
  const category = categoryFromEnrichment(c.enriched_metadata, outcome);

  let status: CaptureStatus = "pending";
  if (outcome === "finding_created" || outcome === "routed") status = "confirmed";
  else if (outcome === "dismissed") status = "dismissed";
  else if (outcome === "no_signal") status = "auto-routed";

  return {
    id: c.capture_id,
    dayGroup,
    // Clock time is meaningless in multi-day groups — show the date there
    time:
      dayGroup === "Today" || dayGroup === "Yesterday"
        ? createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    source: c.origin as "added" | "found",
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
    enrichedMetadata: c.enriched_metadata ?? null,
    extractedData: c.extracted_data ?? null,
    confidence: c.overall_confidence ?? 0,
    isBootstrap: c.is_bootstrap ?? false,
    gateAction: c.gate_action ?? null,
    gateReason: c.gate_reason ?? null,
    playsDispatched: c.plays_dispatched ?? [],
    watchesTriggered: c.watches_triggered ?? [],
  } as RealStreamEntry;
}

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const STATUS_TO_INTELLIGENCE_OUTCOME: Record<CaptureStatus, CaptureIntelligenceOutcome> = {
  "auto-routed": "no_signal",
  pending: "awaiting_scan",
  confirmed: "finding_created",
  dismissed: "dismissed",
};

function resolveStreamEntryCategory(
  status: CaptureStatus,
  enrichedMetadata?: EnrichedCaptureMetadata | null
): CaptureCategory {
  return categoryFromEnrichment(
    enrichedMetadata,
    STATUS_TO_INTELLIGENCE_OUTCOME[status]
  );
}

const CATEGORY_COUNT_TILES: {
  id: CaptureCategory;
  label: string;
  tone: "emerald" | "flame" | "muted" | "destructive" | "sky";
}[] = [
  { id: "queued", label: CAPTURE_CATEGORY_LABELS.queued, tone: "emerald" },
  { id: "no-signal", label: CAPTURE_CATEGORY_LABELS["no-signal"], tone: "muted" },
  { id: "processing", label: CAPTURE_CATEGORY_LABELS.processing, tone: "flame" },
  { id: "error", label: CAPTURE_CATEGORY_LABELS.error, tone: "destructive" },
];

/**
 * Generate a clear, human-readable capture header.
 * Answers "What is this?" at a glance.
 */
function generateCaptureHeader(
  sourceType: string,
  signals: string[],
  extracted: Record<string, unknown> | null | undefined,
  fromLabel: string | undefined
): { type: string; title: string } {
  const data = extracted ?? {};
  const signalSet = new Set(signals);

  // Email
  if (sourceType === "gmail" || sourceType === "outlook" || sourceType === "yahoo_mail") {
    const isSent = signalSet.has("capture_email_sent");
    const isReply = signalSet.has("is_reply");
    const subject = (data.subject as string) ?? null;

    if (isSent) {
      const to = (data.to as string[])?.[0] ?? "recipient";
      return {
        type: isReply ? "Reply sent to" : "Email sent to",
        title: subject ?? to,
      };
    } else {
      const from = fromLabel ?? (data.sender_email as string) ?? "sender";
      return {
        type: isReply ? "Reply from" : "Email from",
        title: subject ?? from,
      };
    }
  }

  // Calendar
  if (sourceType === "googlecalendar" || sourceType === "outlook_calendar" || sourceType === "cal" || sourceType === "calendly") {
    const title = (data.summary as string) ?? (data.title as string) ?? "Event";
    const isOrganizer = signalSet.has("is_organizer");
    const isUpcoming = signalSet.has("meeting_upcoming");

    if (isUpcoming) {
      return { type: "Upcoming meeting", title };
    }
    return { type: isOrganizer ? "Meeting you organized" : "Meeting invite", title };
  }

  // Billing
  if (sourceType === "stripe" || sourceType === "quickbooks" || sourceType === "xero") {
    const eventType = (data.event_type as string) ?? "";
    const customerName = (data.customer_name as string) ?? (data.customer_email as string) ?? "customer";
    const invoiceNumber = data.invoice_number as string | null;
    const rawAmount = data.amount ?? data.amount_paid ?? data.amount_due;
    const amount = typeof rawAmount === "number" ? rawAmount : null;
    const currency = ((data.currency as string) ?? "usd").toUpperCase();

    // extracted money fields are decimal dollars (adapters convert from
    // minor units at ingest) — format as-is, no /100 here.
    const formatAmount = (amt: number) => {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amt);
    };

    if (eventType.includes("payment") || signalSet.has("billing_payment_matched")) {
      return {
        type: "Payment received",
        title: amount ? `${formatAmount(amount)} from ${customerName}` : customerName,
      };
    }
    if (eventType.includes("invoice")) {
      return {
        type: invoiceNumber ? `Invoice #${invoiceNumber}` : "Invoice",
        title: amount ? `${formatAmount(amount)} from ${customerName}` : customerName,
      };
    }
    return { type: "Billing update", title: customerName };
  }

  // Storage
  if (sourceType === "googledrive" || sourceType === "dropbox" || sourceType === "onedrive") {
    const fileName = (data.file_name as string) ?? (data.name as string) ?? "file";
    const owner = (data.owner_email as string) ?? (data.shared_by as string);

    if (owner) {
      return { type: "File shared", title: fileName };
    }
    return { type: "File updated", title: fileName };
  }

  // Slack / Communication
  if (sourceType === "slack") {
    const channel = data.channel as string | null;
    const isDM = signalSet.has("is_direct_message") || (data.is_dm as boolean);
    const sender = (data.sender_name as string) ?? fromLabel;

    if (isDM && sender) {
      return { type: "DM from", title: sender };
    }
    if (channel) {
      return { type: "Message in", title: `#${channel.replace(/^#/, "")}` };
    }
    return { type: "Slack message", title: sender ?? "message" };
  }

  // Meetings / Transcription
  if (sourceType === "fireflies" || sourceType === "otter") {
    const title = (data.meeting_title as string) ?? (data.title as string) ?? "Meeting";
    return { type: "Meeting recording", title };
  }

  // CRM
  if (sourceType === "hubspot" || sourceType === "salesforce" || sourceType === "pipedrive") {
    const entityType = (data.entity_type as string) ?? "record";
    const entityName = (data.entity_name as string) ?? (data.name as string) ?? "Record";

    if (entityType === "deal") {
      return { type: "Deal update", title: entityName };
    }
    if (entityType === "contact") {
      return { type: "Contact", title: entityName };
    }
    return { type: "CRM update", title: entityName };
  }

  // Project Management
  if (sourceType === "linear" || sourceType === "asana" || sourceType === "jira" || sourceType === "trello" || sourceType === "monday") {
    const taskTitle = (data.task_title as string) ?? (data.title as string) ?? (data.issue_title as string) ?? "Task";
    const status = data.status as string | null;
    const assignee = data.assignee as string | null;

    if (signalSet.has("task_assigned_to_you")) {
      return { type: "Task assigned to you", title: taskTitle };
    }
    if (status) {
      return { type: `Task ${status}`, title: taskTitle };
    }
    return { type: "Task update", title: taskTitle };
  }

  // Notion / Documents
  if (sourceType === "notion" || sourceType === "googledocs" || sourceType === "googlesheets" || sourceType === "googleslides") {
    const title = (data.title as string) ?? (data.document_title as string) ?? "Document";
    const mentionsYou = signalSet.has("mentioned_in_document");

    if (mentionsYou) {
      return { type: "Mentioned in", title };
    }
    return { type: "Document updated", title };
  }

  // Default fallback
  return { type: "Capture", title: fromLabel ?? "New activity" };
}

const CATEGORY_STYLES: Record<
  CaptureCategory,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  queued: {
    label: "Queued",
    cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    icon: Play,
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
  initialCaptures = [],
  initialTotalCount = 0,
  initialCounts = null,
  hasRealData = false,
}: CaptureStreamTabProps = {}) {
  const [captures, setCaptures] = useState(initialCaptures);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [counts, setCounts] = useState<CaptureStreamCounts>(
    initialCounts ?? EMPTY_CAPTURE_STREAM_COUNTS,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<CaptureStreamPageSize>(
    DEFAULT_CAPTURE_STREAM_PAGE_SIZE,
  );
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [state, setState] = useState<StreamStateFilter>("all");
  const [area, setArea] = useState<StreamAreaFilter>("all");
  const [dateRange, setDateRange] = useState<ActivityDateRange | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startRetryTransition] = useTransition();
  const [refreshTick, setRefreshTick] = useState(0);

  // Convert real captures to stream entries format with new categories
  const stream: RealStreamEntry[] = useMemo(() => {
    if (!hasRealData || captures.length === 0) return [];
    return captures.map(toRealStreamEntry);
  }, [captures, hasRealData]);

  // Filtering, search, and pagination all happen server-side. The first
  // page arrives as props, so skip fetching until an input actually changes.
  const lastRequestKey = useRef<string | null>(null);
  useEffect(() => {
    const dateFrom = dateRange ? toIsoDate(dateRange.from) : undefined;
    const dateTo = dateRange ? toIsoDate(dateRange.to) : undefined;
    const key = JSON.stringify({
      page,
      pageSize,
      q: debouncedQ.trim(),
      state,
      area,
      dateFrom,
      dateTo,
      refreshTick,
    });
    if (lastRequestKey.current === null || lastRequestKey.current === key) {
      lastRequestKey.current = key;
      return;
    }
    lastRequestKey.current = key;

    startTransition(async () => {
      try {
        const result = await getCaptureStreamPageAction({
          page,
          pageSize,
          search: debouncedQ.trim() || undefined,
          state,
          area,
          dateFrom,
          dateTo,
        });
        setCaptures(result.captures);
        setTotalCount(result.totalCount);
        setCounts(result.counts);
        // The query clamps out-of-range pages (e.g. after filters shrink the
        // feed) — sync the control with the page actually served.
        setPage(result.page);
      } catch {
        toast.error("Couldn't load captures. Try again.");
      }
    });
  }, [page, pageSize, debouncedQ, state, area, dateRange, refreshTick]);

  // Realtime invalidation refetches page-1 data through the sources tab
  // cache. Adopt it when the user is on the unfiltered first page; otherwise
  // re-request the page they're actually viewing.
  const prevInitialCaptures = useRef(initialCaptures);
  useEffect(() => {
    if (prevInitialCaptures.current === initialCaptures) return;
    prevInitialCaptures.current = initialCaptures;
    const unfilteredFirstPage =
      page === 1 &&
      !q.trim() &&
      state === "all" &&
      area === "all" &&
      !dateRange;
    if (unfilteredFirstPage) {
      setCaptures(initialCaptures);
      setTotalCount(initialTotalCount);
      setCounts(initialCounts ?? EMPTY_CAPTURE_STREAM_COUNTS);
    } else {
      setRefreshTick((tick) => tick + 1);
    }
  }, [
    initialCaptures,
    initialTotalCount,
    initialCounts,
    page,
    q,
    state,
    area,
    dateRange,
  ]);

  const handleRetry = useCallback((captureId: string) => {
    setRetryingId(captureId);
    startRetryTransition(async () => {
      const result = await retryCaptureIntelligence(captureId);
      setRetryingId(null);
      if (!result.success) {
        console.error("[CaptureStreamTab] Retry failed:", result.error);
      }
    });
  }, []);

  const handleAskSalt = useCallback(
    (captureId: string, promptHint: string) => {
      const capture = stream.find((e) => e.id === captureId);
      if (!capture) return;

      const sourceMeta = capture.origin in SOURCE_TAXONOMY ? getSourceMeta(capture.origin as CaptureSourceType) : null;
      const sourceLabel = sourceMeta?.label ?? capture.origin;
      const title = capture.subject ?? capture.snippet ?? "Capture";

      window.dispatchEvent(
        new CustomEvent("salt:open-ask-salt", {
          detail: {
            context: {
              type: "capture",
              captureId,
              title,
              sourceLabel,
              href: `/sources?tab=activity`,
            },
            prompt: promptHint,
          },
        })
      );
    },
    [stream]
  );

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const grouped = useMemo(() => {
    const map = new Map<string, RealStreamEntry[]>();
    stream.forEach((e) => {
      const arr = map.get(e.dayGroup) ?? [];
      arr.push(e);
      map.set(e.dayGroup, arr);
    });
    return Array.from(map.entries());
  }, [stream]);

  // Any filter/search/page-size change restarts at the first page.
  const updateSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const updateArea = useCallback((value: StreamAreaFilter) => {
    setArea(value);
    setPage(1);
  }, []);

  const updateDateRange = useCallback((range: ActivityDateRange | null) => {
    setDateRange(range);
    setPage(1);
  }, []);

  const updatePageSize = useCallback((value: string) => {
    setPageSize(Number(value) as CaptureStreamPageSize);
    setPage(1);
  }, []);

  const handleCountTileClick = useCallback((id: CaptureCategory) => {
    setState((prev) => (prev === id ? "all" : id));
    setPage(1);
  }, []);

  const activeFilterCount =
    (state !== "all" ? 1 : 0) + (area !== "all" ? 1 : 0) + (dateRange ? 1 : 0);
  // The Filter button badge only counts what the popover itself controls —
  // state comes from the stat tiles above the toolbar.
  const popoverFilterCount = (area !== "all" ? 1 : 0) + (dateRange ? 1 : 0);

  const tileValues: Record<CaptureCategory, number> = {
    queued: counts.queued,
    "no-signal": counts.noSignal,
    processing: counts.processing,
    error: counts.error,
  };

  // A specific-enough search spans ALL capture history — including
  // dropped/held rows the stream normally hides (Sources plan 2.9).
  const fullHistorySearch = debouncedQ.trim().length >= 2;
  const hasActiveSearchOrFilter = q.trim().length > 0 || activeFilterCount > 0;
  const isEmptyDataset = totalCount === 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-5"
    >
      <section className="glass-card rounded-3xl p-5">
        <header className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            All captures
          </p>
          <h3 className="mt-0.5 font-display text-lg tracking-tight">
            {counts.total} captures
          </h3>
        </header>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {CATEGORY_COUNT_TILES.map(({ id, label, tone }) => (
            <CountTile
              key={id}
              label={label}
              value={tileValues[id]}
              tone={tone}
              active={state === id}
              onClick={() => handleCountTileClick(id)}
            />
          ))}
        </div>
      </section>

      <PlaysSearchField
        value={q}
        onChange={updateSearch}
        placeholder="Search captures…"
        layout="toolbar-actions"
        showDisplay={false}
        filterActive={popoverFilterCount > 0}
        filterActiveCount={popoverFilterCount}
        filterAriaLabel="Filter captures"
        filterTitle=""
        filterContentClassName="w-auto gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
        filterContent={
          <ActivityCombinedFilterMenu
            title="Filter captures"
            facets={[
              {
                id: "area",
                label: "Area",
                options: STREAM_AREA_OPTIONS.filter(
                  (option) => option.id !== "all",
                ),
                selected: area === "all" ? [] : [area],
                onToggle: (id, checked) =>
                  updateArea(checked ? (id as StreamAreaFilter) : "all"),
              },
            ]}
            dateRange={dateRange}
            onDateRangeChange={updateDateRange}
            onClearAll={() => {
              updateArea("all");
              updateDateRange(null);
            }}
          />
        }
      />

      {fullHistorySearch && (
        <p className="px-2 text-[11px] text-muted-foreground">
          {isPending
            ? "Searching full history…"
            : "Full history — includes kept-out and dropped mail with Salt's verdict on each."}
        </p>
      )}

      {grouped.length === 0 && !isPending ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-2xl tracking-tight">
            {isEmptyDataset && !hasActiveSearchOrFilter
              ? "No captures yet"
              : "No matching captures"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEmptyDataset && !hasActiveSearchOrFilter
              ? "Connect Gmail or another tool to start capturing context automatically."
              : fullHistorySearch
                ? "Salt never saw it — nothing in your full capture history matches."
                : "Adjust the filters or search."}
          </p>
        </div>
      ) : (
        <div
          className={cn("space-y-5 transition-opacity", isPending && "opacity-60")}
          aria-busy={isPending}
        >
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
                    onRetry={handleRetry}
                    isRetrying={retryingId === e.id}
                    onAskSalt={handleAskSalt}
                  />
                ))}
              </ul>
            </section>
          ))}

          {/* Numbered pagination */}
          {totalCount > 0 && (
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
              <p className="text-[11px] tabular-nums text-muted-foreground">
                Page {page} of {totalPages} · {totalCount}{" "}
                {totalCount === 1 ? "capture" : "captures"}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Select value={String(pageSize)} onValueChange={updatePageSize}>
                  <SelectTrigger
                    aria-label="Rows per page"
                    className="h-8 w-[104px] rounded-full border-border/60 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPTURE_STREAM_PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {totalPages > 1 && (
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          aria-disabled={page <= 1}
                          className={cn(page <= 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                      {paginationRange.map((item, index) =>
                        typeof item === "number" ? (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              isActive={item === page}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={`${item}-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (page < totalPages) setPage(page + 1);
                          }}
                          aria-disabled={page >= totalPages}
                          className={cn(
                            page >= totalPages && "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CaptureIconActionButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-all duration-200 hover:bg-background/90 hover:text-foreground hover:shadow-sm active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CaptureRow({
  entry: e,
  isOpen,
  onToggle,
  onRetry,
  isRetrying,
  onAskSalt,
}: {
  entry: RealStreamEntry;
  isOpen: boolean;
  onToggle: () => void;
  onRetry: (id: string) => void;
  isRetrying: boolean;
  onAskSalt?: (captureId: string, promptHint: string) => void;
}) {
  const isUserAdded = e.source === "added";
  const enriched = e.enrichedMetadata;
  const signals = enriched?.signals_matched ?? [];
  const isNoise = isNoiseEntry(e);

  // Generate clear header: "Email from John Smith" / "Invoice: $4,500"
  const header = generateCaptureHeader(e.origin, signals, e.extractedData, e.from);

  const categoryStyle = CATEGORY_STYLES[e.category];
  const CategoryIcon = categoryStyle.icon;
  const showRetryAction = e.category === "error" && !!onRetry;
  const hasIconActions = showRetryAction;

  // Noise rows render demoted: muted, no "Review with Salt" CTA.
  const reviewWithSaltButton = onAskSalt && !isNoise ? (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        onAskSalt(e.id, "What should I do with this?");
      }}
      className={cn(
        "group/review inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-60",
        hasIconActions
          ? "ml-0.5 border border-border/60 bg-background text-foreground shadow-sm hover:border-border hover:shadow-md"
          : "border border-border/50 bg-muted/60 text-foreground/80 shadow-sm hover:border-border/80 hover:bg-background hover:text-foreground hover:shadow-md"
      )}
    >
      <Sparkles
        className="size-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover/review:text-foreground"
        strokeWidth={2}
      />
      <span className="max-w-[10rem] truncate sm:max-w-none">
        Review with Salt
      </span>
    </button>
  ) : null;

  return (
    <li>
      {/* Header Row: Logo | What is this + Title | Context Badges | Review | Chevron */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40",
          isNoise && "opacity-55 hover:opacity-90"
        )}
      >
        {/* Time + Connector Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="w-[52px] text-[11px] font-medium tabular-nums text-muted-foreground">
            {e.time}
          </span>
          {isUserAdded ? (
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground"
              title="You added"
            >
              <User className="size-4" strokeWidth={2} />
            </span>
          ) : (
            <CaptureSourceIcon entry={e} />
          )}
        </div>

        {/* Clear Header: Type + Title + Badges */}
        <div className="min-w-0 flex-1">
          {/* Line 1: What is this (e.g., "Email from John Smith") */}
          <p className="text-[13px] font-semibold leading-tight text-foreground">
            {header.type}
          </p>
          {/* Line 2: Title/Subject (e.g., "Re: Website Redesign Proposal") */}
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {header.title}
          </p>
          {/* Line 3: Trigger badges (Plays, Watching) + Category */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Gate verdict — kept-out/dropped rows surface the reason (2.9) */}
            {(e.gateAction === "held" || e.gateAction === "drop") && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                title={e.gateReason ?? undefined}
              >
                <Ban className="size-2.5" strokeWidth={2.5} />
                {e.gateAction === "held" ? "Kept out" : "Dropped"}
                {e.gateReason ? ` — ${e.gateReason}` : ""}
              </span>
            )}
            {/* Triggered plays */}
            {(e.playsDispatched ?? []).map((play) => (
              <span
                key={play.play_run_id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
              >
                <Play className="size-2.5" strokeWidth={2.5} />
                Triggered: {play.play_name}
              </span>
            ))}
            {/* Triggered watching */}
            {(e.watchesTriggered ?? []).map((watch) => (
              <span
                key={watch.entity_id}
                className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300"
              >
                <Eye className="size-2.5" strokeWidth={2.5} />
                Triggered Watching: {watch.entity_label}
              </span>
            ))}
            {/* Category badge (if no triggers, show category) */}
            {(e.playsDispatched ?? []).length === 0 && (e.watchesTriggered ?? []).length === 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  categoryStyle.cls
                )}
              >
                <CategoryIcon className="size-2.5" strokeWidth={2.5} />
                {CAPTURE_CATEGORY_LABELS[e.category]}
              </span>
            )}
          </div>
        </div>

        {/* Action toolbar — pill when icon actions exist; standalone CTA otherwise */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {hasIconActions ? (
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1 shadow-sm transition-all duration-200 hover:border-border/70 hover:bg-muted/70">
              {showRetryAction && (
                <CaptureIconActionButton
                  label="Retry"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onRetry(e.id);
                  }}
                >
                  <RefreshCw className={cn("size-[18px]", isRetrying && "animate-spin")} strokeWidth={1.75} />
                </CaptureIconActionButton>
              )}
              {reviewWithSaltButton}
            </div>
          ) : (
            reviewWithSaltButton
          )}

          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60",
              isOpen && "bg-muted/50 text-foreground"
            )}
            aria-hidden
          >
            <ChevronDown
              className={cn(
                "size-[18px] transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              strokeWidth={1.75}
            />
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            <CaptureCardDetail
              entry={e}
              onRetry={onRetry}
              isRetrying={isRetrying}
              onAskSalt={onAskSalt ? (hint) => onAskSalt(e.id, hint) : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Title case play slug: "timeline-review" → "Timeline Review" */
function formatPlaySlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const SCORE_CHIP =
  "inline-flex shrink-0 items-center rounded-full border border-border/50 bg-background/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80";

function SuggestedPlayRow({
  slug,
  score,
  reason,
}: {
  slug: string;
  score: number;
  reason?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="surface-aurora grid size-7 shrink-0 place-items-center rounded-full">
        <Play className="relative z-10 size-3 text-white" strokeWidth={2.25} />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-x-1.5 overflow-hidden">
        <span className="shrink-0 text-[12px] font-medium text-foreground/80">
          {formatPlaySlug(slug)}
        </span>
        {reason && (
          <>
            <span className="shrink-0 text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span className="min-w-0 truncate text-[12px] text-foreground/80">{reason}</span>
          </>
        )}
      </div>
      <span className={SCORE_CHIP}>{score}%</span>
    </div>
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
  return { label: origin, icon: Sparkles, category: "manual" as SourceCategory };
}

function cleanSnippet(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TRIAGE_ACTION_LABELS: Record<string, string> = {
  surface_now: "surface now",
  batch_digest: "batch into digest",
  silent_archive: "archive silently",
};

const CLASSIFICATION_CATEGORY_LABELS: Record<string, string> = {
  action_required: "Action required",
  money_moves: "Money moves",
  opportunities: "Opportunity",
  updates: "Update",
  subscribed: "Subscribed",
  noise: "Noise",
};

function formatClassificationSummary(classification: {
  type: string;
  category: string;
  priority_tier: string;
  priority_score: number;
  triage_action: string;
}): string {
  const category =
    CLASSIFICATION_CATEGORY_LABELS[classification.category] ?? classification.category;
  const type =
    classification.type.charAt(0).toUpperCase() + classification.type.slice(1);
  const triage =
    TRIAGE_ACTION_LABELS[classification.triage_action] ?? classification.triage_action;
  return `${category} \u00b7 ${type} \u00b7 Priority ${classification.priority_tier} (${classification.priority_score}/100) \u00b7 Triage: ${triage}`;
}

function deriveNoActionReason(entry: RealStreamEntry): string {
  const enriched = entry.enrichedMetadata;
  const decision = enriched?.record_capture_decision;

  // Use the decision reason if available
  if (decision?.reason) {
    return decision.reason;
  }

  // Check for common no-action scenarios
  const signals = enriched?.signals_matched ?? [];
  const hasAutomated = signals.some((s) => s.includes("automated") || s.includes("marketing") || s.includes("newsletter"));
  const hasNoreply = signals.some((s) => s.includes("noreply"));

  if (hasAutomated || hasNoreply) {
    return "Automated or marketing email \u2014 filtered as noise.";
  }

  if (entry.isBootstrap) {
    return "Historical sync \u2014 no active signals detected.";
  }

  // Default explanations by source type
  const origin = entry.origin as string;
  if (origin === "gmail" || origin === "outlook") {
    return "No reply needed or sender not in your network yet.";
  }
  if (["googlecalendar", "calendly", "calcom", "outlook_calendar", "cal"].includes(origin)) {
    return "Meeting doesn't require follow-up action.";
  }
  if (origin === "stripe" || origin === "quickbooks") {
    return "Billing event processed \u2014 no action required.";
  }

  return "No actionable signals detected in this capture.";
}

const SURFACE_ICONS: Record<string, LucideIcon> = {
  people: User,
  orgs: Building2,
  work: Briefcase,
  billing: CreditCard,
  files: FileText,
  meetings: Calendar,
  conversations: MessageSquare,
  me: User,
};

/** Get source label for context attribution */
function getSourceLabel(sourceType: string): string {
  const meta = getSourceMeta(sourceType);
  if (meta) return meta.label;
  return sourceType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const DETAIL_TEXT = "text-[12px] leading-relaxed text-foreground/80";
const DETAIL_LABEL = "font-medium text-foreground/90";

function DetailFields({ children }: { children: ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function DetailSourceHeader({
  sourceLabel,
  sourceUrl,
  isBootstrap = false,
}: {
  sourceLabel: string;
  sourceUrl?: string | null;
  isBootstrap?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[10px] font-medium text-muted-foreground/70">
        {isBootstrap ? (
          <>
            Synced from history
            <span className="mx-1 text-muted-foreground/40" aria-hidden>
              ·
            </span>
            {sourceLabel}
          </>
        ) : (
          <>Triggered from {sourceLabel}</>
        )}
      </p>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 transition hover:text-foreground/70"
        >
          Open in {sourceLabel}
          <ExternalLink className="size-3" strokeWidth={2} />
        </a>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: ReactNode;
}) {
  const content = children ?? (value != null && value !== "" ? value : null);
  if (content == null || content === "") return null;

  return (
    <p className={DETAIL_TEXT}>
      <span className={DETAIL_LABEL}>{label}:</span> {content}
    </p>
  );
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={DETAIL_TEXT}>
      <p>
        <span className={DETAIL_LABEL}>{label}:</span>
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function DetailList({
  label,
  items,
  max = 5,
}: {
  label: string;
  items: string[];
  max?: number;
}) {
  if (items.length === 0) return null;

  const shown = items.slice(0, max);
  const overflow = items.length - max;

  return (
    <div className={DETAIL_TEXT}>
      <p>
        <span className={DETAIL_LABEL}>{label}:</span>
      </p>
      <ul className="mt-0.5 list-none space-y-0.5">
        {shown.map((item, i) => (
          <li key={i}>· {item}</li>
        ))}
        {overflow > 0 && (
          <li className="text-muted-foreground">· +{overflow} more</li>
        )}
      </ul>
    </div>
  );
}

function DetailLink({
  label,
  href,
  text,
}: {
  label: string;
  href: string;
  text: string;
}) {
  return (
    <p className={DETAIL_TEXT}>
      <span className={DETAIL_LABEL}>{label}:</span>{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/80 transition hover:text-foreground/80"
      >
        {text}
      </a>
    </p>
  );
}

/** Render area-specific context from extracted data */
function AreaContext({
  sourceType,
  extracted,
  preview,
  sourceUrl,
  isBootstrap = false,
}: {
  sourceType: string;
  extracted: Record<string, unknown> | null | undefined;
  preview: string;
  sourceUrl?: string | null;
  isBootstrap?: boolean;
}) {
  const data = extracted ?? {};
  const sourceLabel = getSourceLabel(sourceType);

  const header = (
    <DetailSourceHeader
      sourceLabel={sourceLabel}
      sourceUrl={sourceUrl}
      isBootstrap={isBootstrap}
    />
  );

  // Email context
  if (sourceType === "gmail" || sourceType === "outlook" || sourceType === "yahoo_mail") {
    const to = (data.to as string[]) ?? [];
    const cc = (data.cc as string[]) ?? [];
    const hasAttachments =
      data.has_attachments === true || (data.attachments as unknown[])?.length > 0;
    const subject = data.subject as string | null;
    const fromName = data.from_name as string | null;
    const fromEmail = data.from_email as string | null;
    const fromDisplay = fromName ?? fromEmail;

    return (
      <DetailFields>
        {header}
        <DetailRow label="From" value={fromDisplay} />
        <DetailRow label="Subject" value={subject} />
        {to.length > 0 && (
          <DetailRow
            label="To"
            value={`${to.slice(0, 3).join(", ")}${to.length > 3 ? ` +${to.length - 3}` : ""}`}
          />
        )}
        {cc.length > 0 && (
          <DetailRow
            label="CC"
            value={`${cc.slice(0, 2).join(", ")}${cc.length > 2 ? ` +${cc.length - 2}` : ""}`}
          />
        )}
        {preview && <DetailBlock label="Body">{preview}</DetailBlock>}
        {hasAttachments && <DetailRow label="Attachments" value="Yes" />}
      </DetailFields>
    );
  }

  // Calendar context
  if (
    sourceType === "googlecalendar" ||
    sourceType === "outlook_calendar" ||
    sourceType === "cal" ||
    sourceType === "calendly"
  ) {
    const start = data.start as string | null;
    const end = data.end as string | null;
    const location = data.location as string | null;
    const attendees = data.attendees as Array<{ email?: string; name?: string }> | null;
    const attendeeCount = (attendees?.length ?? (data.attendee_count as number | null)) ?? 0;
    const organizer = data.organizer_email as string | null;
    const meetingUrl =
      (data.meeting_link as string) ?? (data.meeting_url as string) ?? null;

    const formatTime = (iso: string) => {
      try {
        return new Date(iso).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return iso;
      }
    };

    const timeValue =
      start &&
      `${formatTime(start)}${
        end
          ? ` to ${new Date(end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
          : ""
      }`;

    const attendeeNames = attendees
      ?.map((a) => a.name ?? a.email)
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");

    const attendeesValue =
      attendeeNames && attendeeCount > 0
        ? `${attendeeNames}${attendeeCount > 4 ? ` +${attendeeCount - 4}` : ""}`
        : attendeeCount > 0
          ? `${attendeeCount} attendee${attendeeCount !== 1 ? "s" : ""}`
          : null;

    return (
      <DetailFields>
        {header}
        <DetailRow label="Time" value={timeValue} />
        <DetailRow label="Location" value={location} />
        <DetailRow label="Attendees" value={attendeesValue} />
        <DetailRow label="Organizer" value={organizer} />
        {meetingUrl && (
          <DetailLink label="Meeting link" href={meetingUrl} text="Join meeting" />
        )}
      </DetailFields>
    );
  }

  // Billing context
  if (sourceType === "stripe" || sourceType === "quickbooks" || sourceType === "xero") {
    const rawAmount = data.amount ?? data.amount_paid ?? data.amount_due;
    const amount = typeof rawAmount === "number" ? rawAmount : null;
    const currency = (data.currency as string)?.toUpperCase() ?? "USD";
    const customerName = data.customer_name as string | null;
    const customerEmail = data.customer_email as string | null;
    const invoiceNumber = data.invoice_number as string | null;
    const status = data.status as string | null;
    const dueDate = data.due_date as string | null;

    // extracted money fields are decimal dollars — no /100 here.
    const formatAmount = (amt: number, curr: string) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(amt);

    const amountValue =
      amount !== null
        ? `${formatAmount(amount, currency)}${status ? ` (${status})` : ""}`
        : null;

    const dueValue = dueDate
      ? new Date(dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return (
      <DetailFields>
        {header}
        <DetailRow label="Amount" value={amountValue} />
        <DetailRow label="Customer" value={customerName ?? customerEmail} />
        <DetailRow label="Invoice" value={invoiceNumber ? `#${invoiceNumber}` : null} />
        <DetailRow label="Due" value={dueValue} />
      </DetailFields>
    );
  }

  // Storage context
  if (sourceType === "googledrive" || sourceType === "dropbox" || sourceType === "onedrive") {
    const fileName = data.file_name as string | null;
    const mimeType = data.mime_type as string | null;
    const owner = data.owner_email as string | null;
    const folder = data.folder_path as string | null;
    const fileSize = data.file_size as number | null;

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const metaParts = [mimeType, fileSize ? formatSize(fileSize) : null].filter(Boolean);

    return (
      <DetailFields>
        {header}
        <DetailRow label="File" value={fileName} />
        <DetailRow label="Folder" value={folder} />
        <DetailRow label="Shared by" value={owner} />
        {metaParts.length > 0 && <DetailRow label="Details" value={metaParts.join(" · ")} />}
      </DetailFields>
    );
  }

  // Slack context
  if (sourceType === "slack") {
    const channel = data.channel as string | null;
    const isDM = data.is_dm as boolean | null;
    const senderName = data.sender_name as string | null;
    const senderId = data.sender_id as string | null;
    const text = data.text as string | null;
    const message = text ?? preview;

    return (
      <DetailFields>
        {header}
        {!isDM && channel && <DetailRow label="Channel" value={`#${channel}`} />}
        <DetailRow label="From" value={senderName ?? senderId} />
        {message && <DetailBlock label="Message">{message}</DetailBlock>}
      </DetailFields>
    );
  }

  // Meeting transcript context (Fireflies, Otter)
  if (sourceType === "fireflies" || sourceType === "otter") {
    const duration = data.duration_minutes as number | null;
    const participants = data.participants as string[] | null;
    const summary = data.summary as string | null;
    const actionItems = data.action_items as string[] | null;

    const participantsValue =
      participants && participants.length > 0
        ? `${participants.slice(0, 4).join(", ")}${
            participants.length > 4 ? ` +${participants.length - 4}` : ""
          }`
        : null;

    return (
      <DetailFields>
        {header}
        <DetailRow label="Duration" value={duration ? `${duration} min` : null} />
        <DetailRow label="Participants" value={participantsValue} />
        {summary && <DetailBlock label="Summary">{summary}</DetailBlock>}
        {actionItems && actionItems.length > 0 && (
          <DetailList label="Action items" items={actionItems} max={5} />
        )}
      </DetailFields>
    );
  }

  // CRM context (HubSpot, Salesforce, Pipedrive)
  if (sourceType === "hubspot" || sourceType === "salesforce" || sourceType === "pipedrive") {
    const entityType = data.entity_type as string | null;
    const entityName = (data.entity_name as string) ?? (data.name as string) ?? null;
    const status = data.status as string | null;
    const stage = data.stage as string | null;
    const value = data.deal_value as number | null;
    // Deal values are decimal dollars + ISO currency, same contract as billing.
    const currency = ((data.currency as string) ?? "USD").toUpperCase();

    let valueFormatted: string | null = null;
    if (value != null) {
      try {
        valueFormatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(value);
      } catch {
        valueFormatted = `${value.toLocaleString()} ${currency}`;
      }
    }

    return (
      <DetailFields>
        {header}
        <DetailRow label="Name" value={entityName} />
        <DetailRow label="Type" value={entityType} />
        <DetailRow label="Status" value={status} />
        <DetailRow label="Stage" value={stage} />
        <DetailRow label="Value" value={valueFormatted} />
        {preview && <DetailBlock label="Notes">{preview}</DetailBlock>}
      </DetailFields>
    );
  }

  // Project management context (Linear, Asana, etc.)
  if (
    sourceType === "linear" ||
    sourceType === "asana" ||
    sourceType === "jira" ||
    sourceType === "trello" ||
    sourceType === "monday"
  ) {
    const status = data.status as string | null;
    const priority = data.priority as string | null;
    const assignee = data.assignee as string | null;
    const project = data.project as string | null;
    const description = data.description as string | null;
    const body = description ?? preview;
    const truncatedBody =
      body && body.length > 200 ? `${body.slice(0, 200)}...` : body;

    return (
      <DetailFields>
        {header}
        <DetailRow label="Project" value={project} />
        <DetailRow label="Status" value={status} />
        <DetailRow label="Priority" value={priority} />
        <DetailRow label="Assignee" value={assignee} />
        {truncatedBody && <DetailBlock label="Description">{truncatedBody}</DetailBlock>}
      </DetailFields>
    );
  }

  // Default fallback
  return (
    <DetailFields>
      {header}
      {preview ? (
        <DetailBlock label="Preview">{preview}</DetailBlock>
      ) : (
        <DetailRow label="Preview" value="No context available" />
      )}
    </DetailFields>
  );
}

function CaptureCardDetail({
  entry: e,
  onRetry,
  isRetrying,
  onAskSalt,
}: {
  entry: RealStreamEntry;
  onRetry: (id: string) => void;
  isRetrying: boolean;
  onAskSalt?: (promptHint: string) => void;
}) {
  const enriched = e.enrichedMetadata;
  const preview = e.contentSnippet ? cleanSnippet(e.contentSnippet) : "";
  const hasSignals = (enriched?.signals_matched?.length ?? 0) > 0;
  const hasLinkedRecords = (enriched?.linked_records?.length ?? 0) > 0;
  const hasPlayFit = enriched?.play_fit && Object.keys(enriched.play_fit).length > 0;
  const classification = enriched?.email_classification;
  const decision = enriched?.record_capture_decision;
  const hasAnalysisData =
    hasSignals || hasLinkedRecords || hasPlayFit || Boolean(classification) || Boolean(decision);
  const feedbackSenderEmail =
    typeof e.extractedData?.sender_email === "string"
      ? (e.extractedData.sender_email as string)
      : null;

  const allPlayFit = hasPlayFit
    ? Object.entries(enriched!.play_fit).sort(([, a], [, b]) => b.score - a.score)
    : [];

  return (
    <div className="flex gap-3 px-4 pt-2 pb-3">
      {/* Spacer mirrors CaptureRow header: time + source icon */}
      <div className="flex shrink-0 items-center gap-2.5" aria-hidden>
        <span className="w-[52px]" />
        <span className="size-8 shrink-0" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/15">
        {/* CONTEXT SECTION - Area-specific extracted data */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Details
          </p>
          <AreaContext
            sourceType={e.origin}
            extracted={e.extractedData}
            preview={preview}
            sourceUrl={e.sourceUrl}
            isBootstrap={e.isBootstrap}
          />
        </div>

        {/* SALT'S ANALYSIS - Always visible */}
        <div className="border-t border-border/40 px-4 py-3">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Salt&apos;s Analysis
          </p>
          <div className="space-y-3">
            {/* Email classification (stored analysis, emails only) */}
            {classification && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  Classification
                </p>
                <p className={DETAIL_TEXT}>
                  {formatClassificationSummary(classification)}
                </p>
              </div>
            )}

            {/* Record capture decision reason (stored, from criteria engine) */}
            {decision?.reason && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  Salt&apos;s decision
                </p>
                <p className={DETAIL_TEXT}>{decision.reason}</p>
              </div>
            )}

            {/* Signals */}
            {hasSignals && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  Signals detected
                </p>
                <SignalBadges
                  signals={enriched!.signals_matched}
                  maxDisplay={8}
                  variant="plain"
                />
              </div>
            )}

            {/* Related Records (renamed from "Linked to Memory") */}
            {hasLinkedRecords && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  Related to
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {enriched!.linked_records.map((record) => {
                    const Icon = SURFACE_ICONS[record.surface] ?? Mail;
                    return (
                      <span
                        key={`${record.surface}-${record.entity_id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[11px] font-medium"
                      >
                        <Icon className="size-3 text-muted-foreground" strokeWidth={2} />
                        <span className="truncate">{record.entity_label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Play Fit - Suggested Plays */}
            {allPlayFit.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  Suggested plays
                </p>
                <div className="space-y-2.5">
                  {allPlayFit.map(([slug, fit]) => (
                    <SuggestedPlayRow
                      key={slug}
                      slug={slug}
                      score={fit.score}
                      reason={fit.reason}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No action explanation - show when no analysis data */}
            {!hasAnalysisData && (
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <MinusCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                <p>
                  {e.category === "processing" ? (
                    "No analysis yet \u2014 Salt scans on a schedule."
                  ) : e.category === "no-signal" ? (
                    deriveNoActionReason(e)
                  ) : (
                    "No analysis stored for this capture yet."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* TRAIN SALT — explicit feedback loop (Phase C2) */}
        {feedbackSenderEmail && (
          <CaptureFeedbackBar captureId={e.id} senderEmail={feedbackSenderEmail} />
        )}

        {/* Only show error state with retry - no processing indicator */}
        {e.category === "error" && (
          <div className="flex items-center justify-between gap-3 border-t border-destructive/20 bg-destructive/5 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-destructive">
                Analysis failed
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Something went wrong. You can try again.
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
        )}
        </div>
      </div>
    </div>
  );
}

/**
 * Explicit feedback bar (Phase C2): More/Less like this adjusts the sender's
 * learned reputation; Never blocks the sender at the gate.
 */
function CaptureFeedbackBar({
  captureId,
  senderEmail,
}: {
  captureId: string;
  senderEmail: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<"more" | "less" | "never" | null>(null);

  const feedbackButtonClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition hover:border-border hover:text-foreground disabled:opacity-50";

  if (submitted) {
    return (
      <div className="border-t border-border/40 px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          {submitted === "never"
            ? `Got it — mail from ${senderEmail} won't be captured anymore.`
            : "Thanks — Salt will use this to tune future captures."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-4 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Train Salt
      </span>
      <button
        type="button"
        disabled={isPending}
        className={feedbackButtonClass}
        onClick={() =>
          startTransition(async () => {
            const result = await submitCaptureFeedback(captureId, "more_like_this");
            if (result.success) setSubmitted("more");
          })
        }
      >
        <ThumbsUp className="size-3" strokeWidth={2} />
        More like this
      </button>
      <button
        type="button"
        disabled={isPending}
        className={feedbackButtonClass}
        onClick={() =>
          startTransition(async () => {
            const result = await submitCaptureFeedback(captureId, "less_like_this");
            if (result.success) setSubmitted("less");
          })
        }
      >
        <ThumbsDown className="size-3" strokeWidth={2} />
        Less like this
      </button>
      <button
        type="button"
        disabled={isPending}
        className={feedbackButtonClass}
        onClick={() =>
          startTransition(async () => {
            const result = await neverCaptureSender(captureId);
            if (result.success) setSubmitted("never");
          })
        }
      >
        <Ban className="size-3" strokeWidth={2} />
        Never capture this sender
      </button>
    </div>
  );
}

function CountTile({
  label,
  value,
  tone,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  tone: "emerald" | "flame" | "sky" | "violet" | "muted" | "destructive";
  active?: boolean;
  onClick?: () => void;
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
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl p-3.5 flex items-baseline justify-between gap-2 text-left transition",
        cls,
        onClick && "cursor-pointer hover:opacity-90",
        active && "ring-2 ring-foreground/25 ring-offset-2 ring-offset-background"
      )}
    >
      <p className="font-display text-2xl tracking-tight tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold opacity-80">
        {label}
      </p>
    </button>
  );
}
