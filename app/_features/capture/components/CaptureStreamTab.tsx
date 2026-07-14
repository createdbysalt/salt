"use client";

import { useMemo, useState, useTransition, useCallback, type MouseEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { retryCaptureIntelligence } from "../actions/retry-capture";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CaptureStatus, StreamEntry } from "@/app/_lib/demo/capture-demo-data";
import type { StreamCaptureSummary, CaptureIntelligenceOutcome, EnrichedCaptureMetadata } from "../types";
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
import { SourceExternalLink } from "./SourceExternalLink";
import { SignalBadges } from "./SignalBadges";
import { SuggestedActionsBar } from "./SuggestedActionsBar";
import {
  CaptureFilterContent,
  CaptureFilterPopover,
  countCaptureFilters,
  ORIGIN_TO_AREA,
  type StreamStateFilter,
  type StreamAreaFilter,
  type StreamTimingFilter,
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
  matched_value: string;
};

type RealStreamEntry = StreamEntry & {
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
};

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

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
  id: CaptureCategory | "watching";
  label: string;
  tone: "emerald" | "flame" | "muted" | "destructive" | "sky";
}[] = [
  { id: "queued", label: CAPTURE_CATEGORY_LABELS.queued, tone: "emerald" },
  { id: "watching", label: "Triggered Watching", tone: "sky" },
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
    const rawAmount = data.amount_paid ?? data.amount_due ?? data.amount;
    const amount = typeof rawAmount === "number" ? rawAmount : null;
    const currency = ((data.currency as string) ?? "usd").toUpperCase();

    const formatAmount = (amt: number) => {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amt / 100);
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
  realStreamCaptures = [],
  realStats = null,
  hasRealData = false,
}: CaptureStreamTabProps = {}) {

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
      // Use enrichment data to determine category when available
      const category = categoryFromEnrichment(c.enriched_metadata, outcome);

      let status: CaptureStatus = "pending";
      if (outcome === "finding_created" || outcome === "routed") status = "confirmed";
      else if (outcome === "dismissed") status = "dismissed";
      else if (outcome === "no_signal") status = "auto-routed";

      return {
        id: c.capture_id,
        dayGroup,
        time: createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
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
      } as RealStreamEntry;
    });
  }, [realStreamCaptures, hasRealData]);

  // Use real capture data only
  const stream = realStreamEntries;

  const [q, setQ] = useState("");
  const [state, setState] = useState<StreamStateFilter>("all");
  const [area, setArea] = useState<StreamAreaFilter>("all");
  const [timing, setTiming] = useState<StreamTimingFilter>("all");
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
              href: `/plays?tab=activity&view=captures`,
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

  const entries = useMemo(() => {
    const term = q.trim().toLowerCase();
    return stream
      // State filter (Triggered Play, Triggered Watching, No Action, Processing, Error)
      .filter((e) => {
        if (state === "all") return true;
        if (state === "watching") return (e.watchesTriggered?.length ?? 0) > 0;
        return e.category === state;
      })
      // Area filter (Email, Calendar, Billing, etc.)
      .filter((e) => {
        if (area === "all") return true;
        const captureArea = ORIGIN_TO_AREA[e.origin] ?? "all";
        return captureArea === area;
      })
      // Timing filter (Just happened, Synced from history, Today, etc.)
      .filter((e) => {
        if (timing === "all") return true;
        if (timing === "just-happened") return e.isBootstrap === false;
        if (timing === "synced-history") return e.isBootstrap === true;
        if (timing === "today") return e.dayGroup === "Today";
        if (timing === "yesterday") return e.dayGroup === "Yesterday";
        if (timing === "this-week") return e.dayGroup === "Earlier this week";
        return true;
      })
      // Search filter
      .filter((e) =>
        !term ? true : e.snippet.toLowerCase().includes(term) || e.routedTo.toLowerCase().includes(term)
      );
  }, [q, state, area, timing, stream]);

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
    const today = stream.filter((e) => e.dayGroup === "Today");
    const byCategory = {
      queued: today.filter((e) => e.category === "queued").length,
      watching: today.filter((e) => (e.watchesTriggered?.length ?? 0) > 0).length,
      "no-signal": today.filter((e) => e.category === "no-signal").length,
      processing: today.filter((e) => e.category === "processing").length,
      error: today.filter((e) => e.category === "error").length,
    };
    return {
      ...byCategory,
      noSignal: byCategory["no-signal"],
      total: today.length,
    };
  }, [stream]);

  const handleCountTileClick = useCallback((id: CaptureCategory | "watching") => {
    setState((prev) => (prev === id ? "all" : id));
  }, []);

  const activeFilterCount = countCaptureFilters({
    state,
    onState: setState,
    area,
    onArea: setArea,
    timing,
    onTiming: setTiming,
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
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
          {CATEGORY_COUNT_TILES.map(({ id, label, tone }) => (
            <CountTile
              key={id}
              label={label}
              value={id === "watching" ? counts.watching : counts[id]}
              tone={tone}
              active={state === id}
              onClick={() => handleCountTileClick(id)}
            />
          ))}
        </div>
      </section>

      <PlaysSearchField
        value={q}
        onChange={setQ}
        placeholder="Search captures…"
        filterActive={activeFilterCount > 0}
        filterActiveCount={activeFilterCount}
        filterTitle=""
        filterContentClassName="w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
        filterContent={
          <CaptureFilterContent
            state={state}
            onState={setState}
            area={area}
            onArea={setArea}
            timing={timing}
            onTiming={setTiming}
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
                    onRetry={handleRetry}
                    isRetrying={retryingId === e.id}
                    onAskSalt={handleAskSalt}
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

function CaptureIconActionButton({
  label,
  shortcut,
  onClick,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-all duration-200 hover:bg-background/90 hover:text-foreground hover:shadow-sm active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
      {shortcut ? (
        <span className="pointer-events-none absolute -bottom-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-background text-[9px] font-bold text-muted-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100 group-hover:text-foreground">
          {shortcut}
        </span>
      ) : null}
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

  // Generate clear header: "Email from John Smith" / "Invoice: $4,500"
  const header = generateCaptureHeader(e.origin, signals, e.extractedData, e.from);

  const categoryStyle = CATEGORY_STYLES[e.category];
  const CategoryIcon = categoryStyle.icon;
  const showRetryAction = e.category === "error" && !!onRetry;
  const hasIconActions = showRetryAction;

  const reviewWithSaltButton = onAskSalt ? (
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
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40"
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
                  shortcut="R"
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
  const labels: Record<string, string> = {
    gmail: "Gmail",
    outlook: "Outlook",
    yahoo_mail: "Yahoo Mail",
    googlecalendar: "Google Calendar",
    outlook_calendar: "Outlook Calendar",
    cal: "Cal.com",
    calendly: "Calendly",
    stripe: "Stripe",
    quickbooks: "QuickBooks",
    xero: "Xero",
    googledrive: "Google Drive",
    dropbox: "Dropbox",
    onedrive: "OneDrive",
    slack: "Slack",
    fireflies: "Fireflies",
    otter: "Otter",
    hubspot: "HubSpot",
    salesforce: "Salesforce",
    pipedrive: "Pipedrive",
    linear: "Linear",
    asana: "Asana",
    jira: "Jira",
    trello: "Trello",
    notion: "Notion",
    googledocs: "Google Docs",
    googlesheets: "Google Sheets",
  };
  return labels[sourceType] ?? sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
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
    const meetingUrl = data.meeting_url as string | null;

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
    const rawAmount = data.amount_paid ?? data.amount_due ?? data.amount;
    const amount = typeof rawAmount === "number" ? rawAmount : null;
    const currency = (data.currency as string)?.toUpperCase() ?? "USD";
    const customerName = data.customer_name as string | null;
    const customerEmail = data.customer_email as string | null;
    const invoiceNumber = data.invoice_number as string | null;
    const status = data.status as string | null;
    const dueDate = data.due_date as string | null;

    const formatAmount = (amt: number, curr: string) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(amt / 100);

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
    const text = data.text as string | null;
    const message = text ?? preview;

    return (
      <DetailFields>
        {header}
        {!isDM && channel && <DetailRow label="Channel" value={`#${channel}`} />}
        <DetailRow label="From" value={senderName} />
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
    const entityName = data.entity_name as string | null;
    const status = data.status as string | null;
    const stage = data.stage as string | null;
    const value = data.deal_value as number | null;

    const valueFormatted =
      value != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
        : null;

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
  const hasAnalysisData = hasSignals || hasLinkedRecords || hasPlayFit;

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
                    "Still analyzing this capture..."
                  ) : e.category === "no-signal" ? (
                    deriveNoActionReason(e)
                  ) : (
                    "No actionable signals detected in this capture."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

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
        "rounded-2xl p-3.5 flex flex-col items-start gap-1 text-left transition",
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
