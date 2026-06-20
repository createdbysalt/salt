export const CONNECTORS_TAB = "connectors";
export const CONNECTORS_PAGE_PATH = "/plays";

/** Canonical URL for the Connectors surface (Plays tab). */
export function connectorsPageUrl(
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams({ tab: CONNECTORS_TAB });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return `${CONNECTORS_PAGE_PATH}?${params.toString()}`;
}
