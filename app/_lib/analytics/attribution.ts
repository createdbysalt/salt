const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

const STORAGE_KEY = "salt_attribution";

type AttributionParams = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>>;

/** Persist marketing params from the landing URL for signup events. */
export function captureAttributionFromSearch(search: string): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(search);
  const captured: AttributionParams = {};

  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value) captured[key] = value;
  }

  if (Object.keys(captured).length === 0) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
}

export function getAttributionProperties(): AttributionParams {
  if (typeof window === "undefined") return {};

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AttributionParams;
  } catch {
    return {};
  }
}
