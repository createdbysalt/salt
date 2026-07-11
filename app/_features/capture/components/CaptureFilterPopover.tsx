"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { SlidersHorizontal, Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@repo/utils";
import type { CaptureSource, CaptureStatus } from "@/app/_lib/demo/capture-demo-data";
import type { IntelligenceStreamFilter } from "@/app/_features/capture/services/intelligence/capture-intelligence-outcome";

export type StreamStatusFilter = CaptureStatus | "all";
export type StreamIntelligenceFilter = IntelligenceStreamFilter;
export type StreamSourceFilter = CaptureSource | "all";
export type StreamDateFilter = "all" | "Today" | "Yesterday" | "Earlier this week";

const SOURCE_OPTIONS: { id: StreamSourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "added", label: "Added" },
  { id: "found", label: "Found" },
];

const STATUS_OPTIONS: { id: StreamStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "auto-routed", label: "Auto-routed" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "dismissed", label: "Dismissed" },
];

const INTELLIGENCE_STATUS_OPTIONS: { id: StreamIntelligenceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "finding_created", label: "Finding created" },
  { id: "no_signal", label: "No signal" },
  { id: "awaiting_scan", label: "Awaiting scan" },
  { id: "scan_error", label: "Scan error" },
];

const DATE_OPTIONS: { id: StreamDateFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "Today", label: "Today" },
  { id: "Yesterday", label: "Yesterday" },
  { id: "Earlier this week", label: "Earlier this week" },
];

type StreamProps = {
  source: StreamSourceFilter;
  onSource: (v: StreamSourceFilter) => void;
  status: StreamStatusFilter;
  onStatus: (v: StreamStatusFilter) => void;
  intelligenceStatus?: StreamIntelligenceFilter;
  onIntelligenceStatus?: (v: StreamIntelligenceFilter) => void;
  useIntelligenceFilters?: boolean;
  date: StreamDateFilter;
  onDate: (v: StreamDateFilter) => void;
};

export function countCaptureStreamFilters({
  source,
  status,
  intelligenceStatus = "all",
  useIntelligenceFilters = false,
  date,
}: Pick<StreamProps, "source" | "status" | "intelligenceStatus" | "useIntelligenceFilters" | "date">): number {
  const statusActive = useIntelligenceFilters
    ? intelligenceStatus !== "all"
    : status !== "all";
  return (source !== "all" ? 1 : 0) + (statusActive ? 1 : 0) + (date !== "all" ? 1 : 0);
}

export function CaptureStreamFilterContent({
  source,
  onSource,
  status,
  onStatus,
  intelligenceStatus = "all",
  onIntelligenceStatus,
  useIntelligenceFilters = false,
  date,
  onDate,
}: StreamProps) {
  const statusOptions = useIntelligenceFilters
    ? INTELLIGENCE_STATUS_OPTIONS
    : STATUS_OPTIONS;
  const activeStatus = useIntelligenceFilters ? intelligenceStatus : status;
  const onStatusChange = useIntelligenceFilters
    ? (id: StreamIntelligenceFilter) => onIntelligenceStatus?.(id)
    : (id: StreamStatusFilter) => onStatus(id);

  return (
    <>
      <Section icon={Sparkles} label="Source">
        {SOURCE_OPTIONS.map((o) => (
          <Chip key={o.id} active={source === o.id} onClick={() => onSource(o.id)}>
            {o.label}
          </Chip>
        ))}
      </Section>
      <Section icon={CheckCircle2} label="Status">
        {statusOptions.map((o) => (
          <Chip
            key={o.id}
            active={activeStatus === o.id}
            onClick={() => onStatusChange(o.id as StreamStatusFilter & StreamIntelligenceFilter)}
          >
            {o.label}
          </Chip>
        ))}
      </Section>
      <Section icon={Calendar} label="Date">
        {DATE_OPTIONS.map((o) => (
          <Chip key={o.id} active={date === o.id} onClick={() => onDate(o.id)}>
            {o.label}
          </Chip>
        ))}
      </Section>
    </>
  );
}

export function CaptureStreamFilterPopover(props: StreamProps) {
  const activeCount = countCaptureStreamFilters(props);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={activeCount > 0 ? `Filter (${activeCount} active)` : "Filter"}
          className={cn(
            "relative inline-flex size-9 items-center justify-center rounded-full border transition-all",
            activeCount > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border/60 bg-card text-foreground/80 hover:border-border",
          )}
        >
          <SlidersHorizontal className="size-4" strokeWidth={2} />
          {activeCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-background text-[10px] font-semibold tabular-nums text-foreground">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4 rounded-2xl border-border/60 p-4">
        <CaptureStreamFilterContent {...props} />
      </PopoverContent>
    </Popover>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CheckCircle2;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={2} />
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[12px] font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-card text-foreground/80 hover:border-border"
      )}
    >
      {children}
    </button>
  );
}

type QueueProps = {
  source: StreamSourceFilter;
  onSource: (v: StreamSourceFilter) => void;
};

export function CaptureQueueFilterPopover({ source, onSource }: QueueProps) {
  const activeCount = source !== "all" ? 1 : 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-all",
            activeCount > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border/60 bg-card text-foreground/80 hover:border-border"
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} />
          Filter
          {activeCount > 0 && (
            <span className="rounded-md bg-background/20 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-2xl border-border/60 p-4">
        <Section icon={Sparkles} label="Source">
          {SOURCE_OPTIONS.map((o) => (
            <Chip key={o.id} active={source === o.id} onClick={() => onSource(o.id)}>
              {o.label}
            </Chip>
          ))}
        </Section>
      </PopoverContent>
    </Popover>
  );
}
