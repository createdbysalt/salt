import type { WorkStatus } from "../data";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const STALLED_STAGE_DAYS = 21;

export type WorkProgressInput = {
  status: string;
  startDate: string | null;
  deadline: string | null;
  stageEnteredAt: string | null;
  /** projects.progress_override — a manual value always wins over derivation. */
  progressOverride?: number | null;
  now?: Date;
};

export type WorkProgressResult = {
  progress: number;
  overdue: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isOverdue(input: WorkProgressInput, now: Date): boolean {
  const status = input.status.toLowerCase();
  if (status === "completed" || status === "archived") return false;
  const deadline = parseDate(input.deadline);
  if (!deadline) return false;
  return deadline.getTime() < now.getTime();
}

function daysSince(value: string | null, now: Date): number | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return (now.getTime() - parsed.getTime()) / MS_PER_DAY;
}

export function deriveWorkProgress(input: WorkProgressInput): WorkProgressResult {
  const now = input.now ?? new Date();
  const status = input.status.toLowerCase();
  const overdue = isOverdue(input, now);

  // A manual override always wins (field contract: user-set, never derived over).
  if (input.progressOverride != null) {
    return { progress: clamp(input.progressOverride, 0, 100), overdue };
  }

  switch (status) {
    case "draft":
      return { progress: 5, overdue: false };
    case "signed":
      return { progress: 15, overdue };
    case "completed":
    case "archived":
      return { progress: 100, overdue: false };
    case "active":
    default:
      break;
  }

  const start = parseDate(input.startDate);
  const deadline = parseDate(input.deadline);

  if (start && deadline && deadline.getTime() > start.getTime()) {
    if (start.getTime() > now.getTime()) {
      return { progress: 20, overdue: false };
    }

    const totalMs = deadline.getTime() - start.getTime();
    const elapsedMs = now.getTime() - start.getTime();
    const ratio = clamp(elapsedMs / totalMs, 0, 1);
    const mapped = Math.round(20 + ratio * 70);

    if (overdue) {
      return { progress: clamp(mapped, 20, 90), overdue: true };
    }

    return { progress: clamp(mapped, 20, 90), overdue: false };
  }

  return { progress: 50, overdue };
}

export function deriveWorkStatusBadge(input: WorkProgressInput): WorkStatus {
  const now = input.now ?? new Date();
  const status = input.status.toLowerCase();

  if (status === "completed" || status === "archived") {
    return "Wrapping";
  }

  if (status === "signed") {
    return "Renewing";
  }

  if (status === "on_hold") {
    return "Stalled";
  }

  const overdue = isOverdue(input, now);
  const stageAgeDays = daysSince(input.stageEnteredAt, now);

  if (
    status === "active" &&
    (overdue || (stageAgeDays != null && stageAgeDays > STALLED_STAGE_DAYS))
  ) {
    return "Stalled";
  }

  return "Active";
}
