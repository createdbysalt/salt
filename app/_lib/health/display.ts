import type { HealthFactor, HealthFactorDirection } from "./core";

export type FactorTone = "good" | "watch" | "risk";

export const TONE_DOT: Record<FactorTone, string> = {
  good: "bg-emerald-500",
  watch: "bg-flame",
  risk: "bg-destructive",
};

export const TONE_TEXT: Record<FactorTone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  watch: "text-flame",
  risk: "text-destructive",
};

const TONE_SORT_ORDER: Record<FactorTone, number> = { risk: 0, watch: 1, good: 2 };

export interface DisplayFactor {
  label: string;
  detail?: string;
  tone: FactorTone;
}

export function directionToTone(direction: HealthFactorDirection | string): FactorTone {
  if (direction === "positive") return "good";
  if (direction === "negative") return "risk";
  return "watch";
}

export function bandLabelClass(band: string): string {
  switch (band) {
    case "Healthy":
    case "healthy":
      return TONE_TEXT.good;
    case "Watch":
    case "watch":
      return TONE_TEXT.watch;
    default:
      return TONE_TEXT.risk;
  }
}

export function normalizeHealthFactors(
  factors: HealthFactor[],
  fallback?: DisplayFactor,
): DisplayFactor[] {
  const normalized =
    factors.length > 0
      ? factors.map((factor) => ({
          label: factor.label,
          detail: factor.detail,
          tone: directionToTone(factor.direction),
        }))
      : fallback
        ? [fallback]
        : [];

  return [...normalized].sort((a, b) => TONE_SORT_ORDER[a.tone] - TONE_SORT_ORDER[b.tone]);
}
