const DAY_MS = 86_400_000;

export type PlayRunMomentumRow = {
  state: string;
  ran_at: string | null;
  approved_at: string | null;
};

/** Activity day for momentum — uses execution/approval timestamps only (never updated_at). */
export function playRunActivityTimestamp(row: PlayRunMomentumRow): Date | null {
  if (row.state === "ran") {
    const raw = row.ran_at ?? row.approved_at;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (row.state === "approved") {
    if (!row.approved_at) return null;
    const date = new Date(row.approved_at);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function computeActivityStreak(activityDates: Date[], now = new Date()): number {
  if (activityDates.length === 0) return 0;

  const activeDays = new Set(activityDates.map((date) => toDateKey(startOfDay(date))));
  let streak = 0;
  const cursor = startOfDay(now);

  // Start from today; if no activity today, check if yesterday had activity
  // This allows the streak to persist if user hasn't done work today yet
  if (!activeDays.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    // If yesterday also had no activity, streak is 0
    if (!activeDays.has(toDateKey(cursor))) {
      return 0;
    }
  }

  while (activeDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function computeWeekOverWeekPct(thisWeek: number, lastWeek: number): number | null {
  if (thisWeek === 0 && lastWeek === 0) return null;
  if (lastWeek === 0) return thisWeek > 0 ? 100 : null;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

export function buildWeeklyActivityBars(countsByDay: number[]): number[] {
  const max = Math.max(...countsByDay, 1);
  return countsByDay.map((count) => (count <= 0 ? 0.15 : count / max));
}

export function getWeekNumber(date: Date): number {
  const start = startOfDay(new Date(date.getFullYear(), 0, 1));
  const diff = startOfDay(date).getTime() - start.getTime();
  return Math.max(1, Math.ceil((diff + 1) / (7 * DAY_MS)));
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDurationMinutes(start: Date, end: Date): string {
  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function firstDayOffset(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function weekStartForDay(year: number, month: number, day: number): number {
  const offset = firstDayOffset(year, month);
  const cellIndex = offset + (day - 1);
  const rowStart = cellIndex - (cellIndex % 7);
  return Math.max(1, rowStart - offset + 1);
}

export function weekDaysForStart(
  year: number,
  month: number,
  start: number,
): number[] {
  const totalDays = daysInMonth(year, month);
  const days: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const candidate = start + i;
    if (candidate <= totalDays) days.push(candidate);
  }
  return days;
}

export function formatShortDate(date: Date): { monthLabel: string; dayLabel: string; dateLabel: string } {
  const monthLabel = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const dayLabel = String(date.getDate());
  return {
    monthLabel,
    dayLabel,
    dateLabel: `${monthLabel} ${dayLabel}`,
  };
}

export function normalizeShare(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  return values.map((value) => Math.round((value / total) * 100));
}

export function buildSparkline(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((value) => (value - min) / (max - min));
}
