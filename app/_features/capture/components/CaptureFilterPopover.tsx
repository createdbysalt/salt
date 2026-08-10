"use client";

import { Checkbox } from "@repo/ui";
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
