"use client";

import { Popover, PopoverContent, PopoverTrigger, Checkbox } from "@repo/ui";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@repo/utils";
import type { CaptureCategory } from "@/app/_features/capture/services/intelligence/capture-intelligence-outcome";

// =============================================================================
// Filter Types
// =============================================================================

/** State filter - what happened to the capture */
export type StreamStateFilter = CaptureCategory | "watching" | "all";

/** Area filter - what kind of capture (by connector category) */
export type StreamAreaFilter =
  | "all"
  | "email"
  | "calendar"
  | "billing"
  | "storage"
  | "messaging"
  | "meetings"
  | "crm"
  | "projects";

/** Timing filter - when it happened */
export type StreamTimingFilter =
  | "all"
  | "just-happened"
  | "synced-history"
  | "today"
  | "yesterday"
  | "this-week";

// Legacy exports for backwards compatibility
export type StreamStatusFilter = "all" | "auto-routed" | "pending" | "confirmed" | "dismissed";
export type StreamIntelligenceFilter = "all" | "finding_created" | "no_signal" | "awaiting_scan" | "scan_error";
export type StreamCategoryFilter = StreamStateFilter;
export type StreamSourceFilter = "all" | "added" | "found";
export type StreamDateFilter = "all" | "Today" | "Yesterday" | "Earlier this week";

// =============================================================================
// Filter Options
// =============================================================================

const STATE_OPTIONS: { id: StreamStateFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "queued", label: "Triggered Play" },
  { id: "watching", label: "Triggered Watching" },
  { id: "no-signal", label: "No Action" },
  { id: "processing", label: "Processing" },
  { id: "error", label: "Error" },
];

const AREA_OPTIONS: { id: StreamAreaFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "calendar", label: "Calendar" },
  { id: "billing", label: "Billing" },
  { id: "storage", label: "Storage" },
  { id: "messaging", label: "Messaging" },
  { id: "meetings", label: "Meetings" },
  { id: "crm", label: "CRM" },
  { id: "projects", label: "Projects" },
];

const TIMING_OPTIONS: { id: StreamTimingFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "just-happened", label: "Just happened" },
  { id: "synced-history", label: "Synced from history" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this-week", label: "This week" },
];

/** Map connector origins to area filter categories */
export const ORIGIN_TO_AREA: Record<string, StreamAreaFilter> = {
  // Email
  gmail: "email",
  outlook: "email",
  yahoo_mail: "email",
  // Calendar
  googlecalendar: "calendar",
  outlook_calendar: "calendar",
  calendly: "calendar",
  cal: "calendar",
  // Billing
  stripe: "billing",
  quickbooks: "billing",
  xero: "billing",
  square: "billing",
  // Storage
  googledrive: "storage",
  dropbox: "storage",
  onedrive: "storage",
  // Messaging
  slack: "messaging",
  discord: "messaging",
  whatsapp: "messaging",
  telegram: "messaging",
  // Meetings
  fireflies: "meetings",
  otter: "meetings",
  zoom: "meetings",
  granola: "meetings",
  // CRM
  hubspot: "crm",
  salesforce: "crm",
  pipedrive: "crm",
  // Projects
  linear: "projects",
  asana: "projects",
  notion: "projects",
  clickup: "projects",
  trello: "projects",
  airtable: "projects",
};

// =============================================================================
// Styling
// =============================================================================

const filterSectionLabelClass =
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

const checkboxClassName = "rounded-[4px]";

const captureFilterPopoverClassName =
  "w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0";

// =============================================================================
// New Filter Props (Simplified)
// =============================================================================

export type CaptureFilterProps = {
  state: StreamStateFilter;
  onState: (v: StreamStateFilter) => void;
  area: StreamAreaFilter;
  onArea: (v: StreamAreaFilter) => void;
  timing: StreamTimingFilter;
  onTiming: (v: StreamTimingFilter) => void;
};

export function countCaptureFilters({ state, area, timing }: CaptureFilterProps): number {
  return (state !== "all" ? 1 : 0) + (area !== "all" ? 1 : 0) + (timing !== "all" ? 1 : 0);
}

// =============================================================================
// Legacy Props (for backwards compatibility during migration)
// =============================================================================

type StreamProps = {
  source: StreamSourceFilter;
  onSource: (v: StreamSourceFilter) => void;
  status: StreamStatusFilter;
  onStatus: (v: StreamStatusFilter) => void;
  intelligenceStatus?: StreamIntelligenceFilter;
  onIntelligenceStatus?: (v: StreamIntelligenceFilter) => void;
  category?: StreamCategoryFilter;
  onCategory?: (v: StreamCategoryFilter) => void;
  useIntelligenceFilters?: boolean;
  useCategoryFilters?: boolean;
  date: StreamDateFilter;
  onDate: (v: StreamDateFilter) => void;
};

export function countCaptureStreamFilters({
  source,
  status,
  intelligenceStatus = "all",
  category = "all",
  useIntelligenceFilters = false,
  useCategoryFilters = false,
  date,
}: Pick<StreamProps, "source" | "status" | "intelligenceStatus" | "category" | "useIntelligenceFilters" | "useCategoryFilters" | "date">): number {
  const statusActive = useCategoryFilters
    ? category !== "all"
    : useIntelligenceFilters
      ? intelligenceStatus !== "all"
      : status !== "all";
  return (source !== "all" ? 1 : 0) + (statusActive ? 1 : 0) + (date !== "all" ? 1 : 0);
}

// =============================================================================
// New Filter Content Component
// =============================================================================

export function CaptureFilterContent(props: CaptureFilterProps) {
  const { state, onState, area, onArea, timing, onTiming } = props;

  const activeCount = countCaptureFilters(props);

  function clearAll() {
    onState("all");
    onArea("all");
    onTiming("all");
  }

  return (
    <div className="flex flex-col">
      {activeCount > 0 ? (
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            {activeCount} filter{activeCount === 1 ? "" : "s"} active
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-foreground/80 transition hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">Filter captures</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Filter by state, area, and timing
          </p>
        </div>
      )}

      <div className="max-h-[min(52vh,420px)] overflow-y-auto">
        <FilterSection
          label="State"
          options={STATE_OPTIONS}
          value={state}
          onChange={onState}
        />
        <FilterSection
          label="Area"
          options={AREA_OPTIONS}
          value={area}
          onChange={onArea}
        />
        <FilterSection
          label="Timing"
          options={TIMING_OPTIONS}
          value={timing}
          onChange={onTiming}
          isLast
        />
      </div>
    </div>
  );
}

// =============================================================================
// Legacy Filter Content (for backwards compatibility)
// =============================================================================

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

const CATEGORY_OPTIONS: { id: StreamCategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "queued", label: "Triggered Play" },
  { id: "no-signal", label: "No Action" },
  { id: "processing", label: "Processing" },
  { id: "error", label: "Error" },
];

const DATE_OPTIONS: { id: StreamDateFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "Today", label: "Today" },
  { id: "Yesterday", label: "Yesterday" },
  { id: "Earlier this week", label: "Earlier this week" },
];

export function CaptureStreamFilterContent(props: StreamProps) {
  const {
    source,
    onSource,
    status,
    onStatus,
    intelligenceStatus = "all",
    onIntelligenceStatus,
    category = "all",
    onCategory,
    useIntelligenceFilters = false,
    useCategoryFilters = false,
    date,
    onDate,
  } = props;

  const statusOptions = useCategoryFilters
    ? CATEGORY_OPTIONS
    : useIntelligenceFilters
      ? INTELLIGENCE_STATUS_OPTIONS
      : STATUS_OPTIONS;

  const activeStatus = useCategoryFilters
    ? category
    : useIntelligenceFilters
      ? intelligenceStatus
      : status;

  const onStatusChange = useCategoryFilters
    ? (id: StreamCategoryFilter) => onCategory?.(id)
    : useIntelligenceFilters
      ? (id: StreamIntelligenceFilter) => onIntelligenceStatus?.(id)
      : (id: StreamStatusFilter) => onStatus(id);

  const activeCount = countCaptureStreamFilters(props);

  function clearAll() {
    onSource("all");
    if (useCategoryFilters) {
      onCategory?.("all");
    } else if (useIntelligenceFilters) {
      onIntelligenceStatus?.("all");
    } else {
      onStatus("all");
    }
    onDate("all");
  }

  return (
    <div className="flex flex-col">
      {activeCount > 0 ? (
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            {activeCount} filter{activeCount === 1 ? "" : "s"} active
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-foreground/80 transition hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">Filter captures</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Combine source, outcome, and date filters
          </p>
        </div>
      )}

      <div className="max-h-[min(52vh,420px)] overflow-y-auto">
        <FilterSection
          label="Source"
          options={SOURCE_OPTIONS}
          value={source}
          onChange={onSource}
        />
        <FilterSection
          label="Outcome"
          options={statusOptions}
          value={activeStatus}
          onChange={(id) =>
            onStatusChange(
              id as StreamCategoryFilter & StreamStatusFilter & StreamIntelligenceFilter
            )
          }
        />
        <FilterSection
          label="Date"
          options={DATE_OPTIONS}
          value={date}
          onChange={onDate}
          isLast
        />
      </div>
    </div>
  );
}

// =============================================================================
// Shared Filter Section Component
// =============================================================================

function FilterSection<T extends string>({
  label,
  options,
  value,
  onChange,
  isLast = false,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  isLast?: boolean;
}) {
  return (
    <div className={cn(!isLast && "border-b border-border/60", "p-2")}>
      <p className={filterSectionLabelClass}>{label}</p>
      <div className="mt-1 space-y-0.5">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
          >
            <Checkbox
              className={checkboxClassName}
              checked={value === option.id}
              onCheckedChange={(checked) => {
                if (checked === true) {
                  onChange(option.id);
                } else if (value === option.id) {
                  onChange("all" as T);
                }
              }}
            />
            <span className="min-w-0 flex-1">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// New Filter Popover
// =============================================================================

export function CaptureFilterPopover(props: CaptureFilterProps) {
  const activeCount = countCaptureFilters(props);
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
      <PopoverContent align="end" className={captureFilterPopoverClassName}>
        <CaptureFilterContent {...props} />
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Legacy Filter Popovers (for backwards compatibility)
// =============================================================================

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
      <PopoverContent align="end" className={captureFilterPopoverClassName}>
        <CaptureStreamFilterContent {...props} />
      </PopoverContent>
    </Popover>
  );
}

type QueueProps = {
  source: StreamSourceFilter;
  onSource: (v: StreamSourceFilter) => void;
};

export function CaptureQueueFilterPopover({ source, onSource }: QueueProps) {
  const activeCount = source !== "all" ? 1 : 0;

  function clearAll() {
    onSource("all");
  }

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
      <PopoverContent align="end" className={captureFilterPopoverClassName}>
        <div className="flex flex-col">
          {activeCount > 0 ? (
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">1 filter active</p>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-foreground/80 transition hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          ) : (
            <div className="border-b border-border/60 px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">Filter queue</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Filter by capture source
              </p>
            </div>
          )}
          <div className="p-2">
            <p className={filterSectionLabelClass}>Source</p>
            <div className="mt-1 space-y-0.5">
              {SOURCE_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={source === option.id}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        onSource(option.id);
                      } else if (source === option.id) {
                        onSource("all");
                      }
                    }}
                  />
                  <span className="min-w-0 flex-1">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
