/**
 * Dynamic period generation for goals.
 * Generates relevant period options based on current date and period type.
 */

export type GoalPeriodType = "monthly" | "quarterly" | "yearly" | "ongoing";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getQuarter(month: number): number {
  return Math.floor(month / 3) + 1;
}

function formatMonth(month: number, year: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function formatQuarter(quarter: number, year: number): string {
  return `Q${quarter} ${year}`;
}

/**
 * Generate period options based on type and current date.
 * - monthly: current month + next 11 months (12 total)
 * - quarterly: current quarter + next 7 quarters (2 years)
 * - yearly: current year + next 2 years
 * - ongoing: empty (no period needed)
 */
export function generatePeriodOptions(
  periodType: GoalPeriodType,
  now: Date = new Date(),
): { value: string; label: string }[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = getQuarter(currentMonth);

  switch (periodType) {
    case "monthly": {
      const options: { value: string; label: string }[] = [];
      for (let i = 0; i < 12; i++) {
        const month = (currentMonth + i) % 12;
        const year = currentYear + Math.floor((currentMonth + i) / 12);
        const formatted = formatMonth(month, year);
        options.push({ value: formatted, label: formatted });
      }
      return options;
    }

    case "quarterly": {
      const options: { value: string; label: string }[] = [];
      for (let i = 0; i < 8; i++) {
        const quarter = ((currentQuarter - 1 + i) % 4) + 1;
        const year = currentYear + Math.floor((currentQuarter - 1 + i) / 4);
        const formatted = formatQuarter(quarter, year);
        options.push({ value: formatted, label: formatted });
      }
      return options;
    }

    case "yearly": {
      const options: { value: string; label: string }[] = [];
      for (let i = 0; i < 3; i++) {
        const year = (currentYear + i).toString();
        options.push({ value: year, label: year });
      }
      return options;
    }

    case "ongoing":
    default:
      return [];
  }
}

/**
 * Parse a period string to determine its type.
 */
export function detectPeriodType(period: string | null): GoalPeriodType {
  if (!period) return "ongoing";
  if (/^Q\d\s+\d{4}$/.test(period)) return "quarterly";
  if (/^\d{4}$/.test(period)) return "yearly";
  if (/^[A-Z][a-z]+\s+\d{4}$/.test(period)) return "monthly";
  return "ongoing";
}

/**
 * Get default period type for a goal type.
 */
export function getDefaultPeriodType(goalType: string): GoalPeriodType {
  switch (goalType) {
    case "revenue_target":
      return "yearly";
    case "new_clients":
      return "quarterly";
    case "project_minimum":
    case "work_hours":
      return "ongoing";
    default:
      return "ongoing";
  }
}

/**
 * Check if a goal type supports period selection.
 */
export function supportsPeriods(goalType: string): boolean {
  return goalType === "revenue_target" || goalType === "new_clients";
}

/**
 * Get available period types for a goal type.
 */
export function getAvailablePeriodTypes(goalType: string): GoalPeriodType[] {
  switch (goalType) {
    case "revenue_target":
      return ["monthly", "quarterly", "yearly"];
    case "new_clients":
      return ["monthly", "quarterly", "yearly"];
    default:
      return [];
  }
}

export const PERIOD_TYPE_LABELS: Record<GoalPeriodType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  ongoing: "Ongoing",
};
