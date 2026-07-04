export const SAMPLE_MIN_TOTAL = 300;
export const SAMPLE_MIN_PER = 50;
export const SAMPLE_RICH_TOTAL = 500;
export const SAMPLE_MAX_COUNT = 8;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export type SampleReadiness = "empty" | "building" | "ready" | "rich";

export function sampleReadiness(totalWords: number): SampleReadiness {
  if (totalWords === 0) return "empty";
  if (totalWords < SAMPLE_MIN_TOTAL) return "building";
  if (totalWords < SAMPLE_RICH_TOTAL) return "ready";
  return "rich";
}

export const SAMPLE_READINESS_LABEL: Record<SampleReadiness, string> = {
  empty: "Paste your writing to get started",
  building: "Almost ready — add a bit more",
  ready: "Ready to analyze",
  rich: "Strong sample set",
};

/** Visual fill for a progress bar (0–1), no user-facing numbers. */
export function sampleReadinessProgress(totalWords: number): number {
  if (totalWords <= 0) return 0;
  return Math.min(totalWords / SAMPLE_MIN_TOTAL, 1);
}

export function extractionConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "Strong match";
  if (confidence >= 0.6) return "Good match";
  return "Review carefully";
}

export function sampleHasMinimumContent(text: string): boolean {
  return countWords(text) >= SAMPLE_MIN_PER;
}
