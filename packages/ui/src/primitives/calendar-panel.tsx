"use client"

import * as React from "react"

import { cn } from "@repo/utils"
import { Calendar } from "./calendar"

export const calendarPopoverClassName =
  "w-auto overflow-hidden rounded-2xl border-border/60 p-0 shadow-md"

export function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return undefined
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/** Accepts ISO (`YYYY-MM-DD`), US slash (`M/D/YYYY`), or dash (`M-D-YYYY`) dates. */
export function parseFlexibleDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const iso = parseIsoDate(trimmed)
  if (iso) return iso

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (slashMatch) {
    const [, month, day, year] = slashMatch
    const y = Number(year)
    const m = Number(month)
    const d = Number(day)
    if (isValidCalendarDate(y, m, d)) return new Date(y, m - 1, d)
  }

  const dashMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmed)
  if (dashMatch) {
    const [, month, day, year] = dashMatch
    const y = Number(year)
    const m = Number(month)
    const d = Number(day)
    if (isValidCalendarDate(y, m, d)) return new Date(y, m - 1, d)
  }

  return undefined
}

export function getCalendarMonthBounds(selected?: Date): {
  startMonth: Date
  endMonth: Date
} {
  const now = new Date()
  const selectedYear = selected?.getFullYear()
  const endYear = Math.max(now.getFullYear() + 5, selectedYear ?? 0)
  const startYear = Math.min(now.getFullYear() - 100, (selectedYear ?? now.getFullYear()) - 10)

  return {
    startMonth: new Date(startYear, 0),
    endMonth: new Date(endYear, 11),
  }
}

type CalendarPanelProps = {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  showFooter?: boolean
  className?: string
  calendarClassName?: string
}

function CalendarFooter({
  onClear,
  onToday,
}: {
  onClear: () => void
  onToday: () => void
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 px-3 py-2.5">
      <button
        type="button"
        onClick={onClear}
        className="rounded-full px-2.5 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onToday}
        className="rounded-full px-2.5 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
      >
        Today
      </button>
    </div>
  )
}

export function CalendarPanel({
  selected,
  onSelect,
  showFooter = true,
  className,
  calendarClassName,
}: CalendarPanelProps) {
  const { startMonth, endMonth } = getCalendarMonthBounds(selected)

  return (
    <div className={cn("bg-popover", className)}>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        defaultMonth={selected ?? new Date()}
        captionLayout="dropdown"
        reverseYears
        startMonth={startMonth}
        endMonth={endMonth}
        hideNavigation
        initialFocus
        className={cn("p-3", calendarClassName)}
      />
      {showFooter ? (
        <CalendarFooter
          onClear={() => onSelect?.(undefined)}
          onToday={() => onSelect?.(new Date())}
        />
      ) : null}
    </div>
  )
}
