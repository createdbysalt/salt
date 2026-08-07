/**
 * Cron expression matcher for playbook schedules.
 *
 * Playbook definitions declare simple 5-field UTC cron expressions
 * (e.g. "0 3 * * 0", "0 9 * * 1-5"). The playbook-schedules cron route runs
 * hourly and asks: "should this expression fire during the current hour?"
 *
 * The minute field is intentionally ignored — the route runs once per hour,
 * so any expression scheduled within the hour fires on that hourly tick.
 * Supported syntax per field: "*", numbers, comma lists, ranges (a-b),
 * and steps ("*\/n", "a-b/n").
 */

interface ParsedCron {
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
}

const FIELD_RANGES = {
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 },
} as const;

function parseField(
  field: string,
  range: { min: number; max: number },
): Set<number> | null {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    let body = part;
    let step = 1;

    const stepSplit = part.split("/");
    if (stepSplit.length === 2) {
      body = stepSplit[0];
      step = Number(stepSplit[1]);
      if (!Number.isInteger(step) || step < 1) return null;
    } else if (stepSplit.length > 2) {
      return null;
    }

    let start: number;
    let end: number;

    if (body === "*") {
      start = range.min;
      end = range.max;
    } else if (body.includes("-")) {
      const [rawStart, rawEnd] = body.split("-");
      start = Number(rawStart);
      end = Number(rawEnd);
    } else {
      start = Number(body);
      // A bare number with a step ("3/2") behaves like "3-max/2" in cron
      end = stepSplit.length === 2 ? range.max : start;
    }

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < range.min ||
      end > range.max ||
      start > end
    ) {
      return null;
    }

    for (let value = start; value <= end; value += step) {
      values.add(value);
    }
  }

  return values.size > 0 ? values : null;
}

/**
 * Parse a 5-field cron expression. Returns null when the expression is
 * malformed (callers should log and skip rather than throw).
 */
export function parseCronExpression(expression: string): ParsedCron | null {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;

  // fields[0] is the minute field — ignored (hourly execution granularity)
  const hours = parseField(fields[1], FIELD_RANGES.hour);
  const daysOfMonth = parseField(fields[2], FIELD_RANGES.dayOfMonth);
  const months = parseField(fields[3], FIELD_RANGES.month);
  // Normalize day-of-week 7 → 0 (both mean Sunday)
  const daysOfWeek = parseField(fields[4].replace(/\b7\b/g, "0"), FIELD_RANGES.dayOfWeek);

  if (!hours || !daysOfMonth || !months || !daysOfWeek) return null;

  return { hours, daysOfMonth, months, daysOfWeek };
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Resolve now's hour/day/month/weekday in an IANA timezone (UTC fallback). */
function getTimeParts(
  now: Date,
  timezone?: string,
): { hour: number; dayOfMonth: number; month: number; dayOfWeek: number } {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        day: "numeric",
        month: "numeric",
        weekday: "short",
        hourCycle: "h23",
      }).formatToParts(now);

      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "";

      const hour = Number(get("hour"));
      const dayOfMonth = Number(get("day"));
      const month = Number(get("month"));
      const dayOfWeek = WEEKDAY_TO_INDEX[get("weekday")];

      if (
        Number.isInteger(hour) &&
        Number.isInteger(dayOfMonth) &&
        Number.isInteger(month) &&
        dayOfWeek !== undefined
      ) {
        return { hour, dayOfMonth, month, dayOfWeek };
      }
    } catch {
      // Unknown timezone — fall through to UTC
    }
  }

  return {
    hour: now.getUTCHours(),
    dayOfMonth: now.getUTCDate(),
    month: now.getUTCMonth() + 1,
    dayOfWeek: now.getUTCDay(),
  };
}

/**
 * Whether a cron expression should fire during the hour containing `now`.
 * Comparisons are in UTC unless an IANA `timezone` is provided (playbook
 * schedule triggers may declare one).
 */
export function cronMatchesHour(
  expression: string,
  now: Date,
  timezone?: string,
): boolean {
  const parsed = parseCronExpression(expression);
  if (!parsed) return false;

  const { hour, dayOfMonth, month, dayOfWeek } = getTimeParts(now, timezone);

  // Standard cron semantics: when both day-of-month and day-of-week are
  // restricted, either one matching fires the job.
  const domRestricted = parsed.daysOfMonth.size < FIELD_RANGES.dayOfMonth.max;
  const dowRestricted = parsed.daysOfWeek.size < 7;

  const domMatch = parsed.daysOfMonth.has(dayOfMonth);
  const dowMatch = parsed.daysOfWeek.has(dayOfWeek);

  const dayMatch =
    domRestricted && dowRestricted
      ? domMatch || dowMatch
      : domMatch && dowMatch;

  return parsed.hours.has(hour) && parsed.months.has(month) && dayMatch;
}
