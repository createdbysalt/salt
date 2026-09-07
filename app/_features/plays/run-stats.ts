/**
 * Playbook run statistics — pure math over play_runs rows.
 *
 * Canon: the billing unit is a completed playbook run (state `ran` — the run
 * executed, approved or not auto). "Runs this week", hero-card stats, and the
 * HQ Today time-saved widget all derive from this module so the surfaces can
 * never disagree. The pre-Phase-5b HQ heuristic (stakes → minutes) is retired.
 */

/** A completed play_run row, flattened for math. */
export interface CompletedRunRow {
  /** source_context.playbook_slug */
  playbookSlug: string | null;
  ranAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface PlaybookRunStats {
  /** Completed runs, all time. */
  totalRuns: number;
  /** Completed runs in the trailing 7-day window. */
  runsThisWeek: number;
  /** Median executor duration across recorded runs, ms. Null when none recorded. */
  medianDurationMs: number | null;
  /** Heuristic end-to-end runtime (ms) for one run with no approval waits, from step types. Null when the playbook declares no steps. Display only until medianDurationMs exists. */
  estimatedDurationMs: number | null;
  /** definition.yaml value.estimate — minutes of manual work per run. Null when undeclared. */
  minutesSavedPerRun: number | null;
  /** minutesSavedPerRun × totalRuns. Null when undeclared, or no finished runs. */
  totalMinutesSaved: number | null;
}

export interface WorkspaceRunStats {
  minutesThisWeek: number;
  minutesLastWeek: number;
  /** Minutes per day, oldest-first, trailing 7 days ending today. */
  minutesByDay: number[];
  runsThisWeek: number;
  hasActivity: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The moment a run counts as "done" for stats: when it ran, else when it was
 * approved into ran by the log-only path (both set ran_at; approved_at is a
 * defensive fallback for rows written before ran_at was universal).
 */
export function runCompletedAt(row: CompletedRunRow): Date | null {
  const iso = row.ranAt ?? row.approvedAt;
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDayUtc(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function computePlaybookRunStats(
  rows: CompletedRunRow[],
  durationsMs: number[],
  estimateMinutes: number | null,
  now: Date = new Date(),
  estimatedDurationMs: number | null = null
): PlaybookRunStats {
  const completed = rows
    .map((row) => runCompletedAt(row))
    .filter((date): date is Date => date !== null);

  const weekStart = now.getTime() - 7 * DAY_MS;
  const runsThisWeek = completed.filter(
    (date) => date.getTime() >= weekStart
  ).length;

  return {
    totalRuns: completed.length,
    runsThisWeek,
    medianDurationMs: median(durationsMs),
    estimatedDurationMs,
    minutesSavedPerRun: estimateMinutes,
    totalMinutesSaved:
      estimateMinutes !== null && completed.length > 0
        ? estimateMinutes * completed.length
        : null,
  };
}

/**
 * Workspace-wide time saved: each completed run contributes its playbook's
 * declared value.estimate minutes (unknown slugs / undeclared estimates
 * contribute 0 — never a heuristic constant).
 */
export function computeWorkspaceRunStats(
  rows: CompletedRunRow[],
  estimateBySlug: Map<string, number>,
  now: Date = new Date()
): WorkspaceRunStats {
  const activity = rows
    .map((row) => ({
      date: runCompletedAt(row),
      minutes:
        (row.playbookSlug ? estimateBySlug.get(row.playbookSlug) : undefined) ?? 0,
    }))
    .filter(
      (entry): entry is { date: Date; minutes: number } => entry.date !== null
    );

  const today = startOfDayUtc(now);
  const minutesByDay = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const key = toDayKey(day);
    return activity
      .filter((entry) => toDayKey(entry.date) === key)
      .reduce((sum, entry) => sum + entry.minutes, 0);
  });

  const minutesThisWeek = minutesByDay.reduce((sum, m) => sum + m, 0);

  // Week-over-week: bars cover [today-6, today]; last week is the contiguous
  // 7-day window before it, [today-13, today-7].
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - 13);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - 6);
  const minutesLastWeek = activity
    .filter((entry) => {
      const day = startOfDayUtc(entry.date);
      return day >= lastWeekStart && day < thisWeekStart;
    })
    .reduce((sum, entry) => sum + entry.minutes, 0);

  const weekStart = now.getTime() - 7 * DAY_MS;

  return {
    minutesThisWeek,
    minutesLastWeek,
    minutesByDay,
    runsThisWeek: activity.filter((entry) => entry.date.getTime() >= weekStart)
      .length,
    hasActivity: activity.length > 0,
  };
}

/** "1h 25m" / "45m" / "0m" — shared by hero + HQ widget. */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Median runtime for display: "8s", "1.2m". */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

/**
 * Heuristic per-step runtime (ms) for a run with no approval waits — DB/API
 * reads are ~1.5s, LLM classify ~3s, LLM draft ~6s, tool calls ~1s. Planning
 * estimates only: surfaces must label these as estimates and prefer the
 * measured medianDurationMs once real runs exist.
 */
const STEP_DURATION_ESTIMATE_MS: Record<string, number> = {
  fetch: 1500,
  classify: 3000,
  draft: 6000,
  action: 1000,
  branch: 50,
};

/**
 * Estimated Salt runtime (ms) for running the whole playbook end-to-end,
 * assuming every step executes once and nothing waits on approval. Null when
 * the playbook declares no steps (learn-layer playbooks don't execute).
 */
export function estimatePlaybookRunDurationMs(
  steps: readonly { step: string }[] | null | undefined
): number | null {
  if (!steps || steps.length === 0) return null;
  return steps.reduce(
    (sum, step) => sum + (STEP_DURATION_ESTIMATE_MS[step.step] ?? 1000),
    0
  );
}
