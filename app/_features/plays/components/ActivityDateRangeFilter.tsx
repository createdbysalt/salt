"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import {
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  calendarPopoverClassName,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { playsToolbarMenuButtonClass } from "./PlaysSearchField";

/** Inclusive local-day range selected in the Activity date filter. */
export interface ActivityDateRange {
  from: Date;
  to: Date;
}

type DraftRange = { from: Date | undefined; to?: Date | undefined };

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const PRESETS: { id: string; label: string; resolve: () => ActivityDateRange }[] = [
  {
    id: "today",
    label: "Today",
    resolve: () => {
      const today = startOfToday();
      return { from: today, to: today };
    },
  },
  {
    id: "this-week",
    label: "This week",
    resolve: () => {
      const today = startOfToday();
      const from = new Date(today);
      from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
      return { from, to: today };
    },
  },
  {
    id: "this-month",
    label: "This month",
    resolve: () => {
      const today = startOfToday();
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    },
  },
];

function formatDay(date: Date, referenceYear: number): string {
  return new Intl.DateTimeFormat(
    "en-US",
    date.getFullYear() === referenceYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  ).format(date);
}

/** Trigger/badge label for a selected range, e.g. "Aug 1 – Aug 10". */
export function formatActivityDateRange(range: ActivityDateRange): string {
  const referenceYear = new Date().getFullYear();
  const from = formatDay(range.from, referenceYear);
  const to = formatDay(range.to, referenceYear);
  return from === to ? from : `${from} – ${to}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ActivityDateRangeFilter({
  value,
  onChange,
}: {
  value: ActivityDateRange | null;
  onChange: (range: ActivityDateRange | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftRange | undefined>(value ?? undefined);

  // react-day-picker completes a single-day range on the first click
  // (min=0), so a draft is committable as soon as from and to exist.
  const draftComplete =
    draft?.from && draft?.to ? { from: draft.from, to: draft.to } : null;
  const singleDay = draftComplete && isSameDay(draftComplete.from, draftComplete.to);

  function applyDraft() {
    if (!draftComplete) return;
    onChange(draftComplete);
    setOpen(false);
  }

  function clear() {
    setDraft(undefined);
    onChange(null);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value ?? undefined);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            playsToolbarMenuButtonClass,
            value && "border-border bg-muted/70 text-foreground",
          )}
        >
          <CalendarIcon className="size-4" strokeWidth={2} />
          {value ? formatActivityDateRange(value) : "Date range"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={calendarPopoverClassName}>
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-row gap-1 border-b border-border/60 p-2 sm:flex-col sm:border-b-0 sm:border-r">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const range = preset.resolve();
                  setDraft(range);
                  onChange(range);
                  setOpen(false);
                }}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-sm text-foreground/80 transition hover:bg-muted/60 hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div>
            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              numberOfMonths={2}
              defaultMonth={draft?.from ?? draft?.to ?? new Date()}
              initialFocus
            />
            <div className="space-y-1.5 border-t border-border/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground/80">
                  {draftComplete
                    ? formatActivityDateRange(draftComplete)
                    : "Pick a date"}
                </p>
                <div className="flex items-center gap-1">
                  {value || draft?.from ? (
                    <button
                      type="button"
                      onClick={clear}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                    >
                      <X className="size-3.5" />
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={applyDraft}
                    disabled={!draftComplete}
                    className="rounded-full bg-foreground px-3 py-1 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {singleDay
                  ? "Click another day to make it a range, or Apply for just this day."
                  : "Click a start day, then an end day."}
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
