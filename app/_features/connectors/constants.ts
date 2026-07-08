export const CONNECTORS_TAB = "customize";
export const CONNECTORS_SECTION = "connectors";
export const CONNECTORS_PAGE_PATH = "/plays";

/**
 * Canonical URL for the Connectors surface — the Plays → Customize →
 * Connectors tab. Pass `connector` to deep-link a specific connector's detail,
 * or any extra query params (e.g. OAuth result flags).
 */
export function connectorsPageUrl(
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams({
    tab: CONNECTORS_TAB,
    customize: CONNECTORS_SECTION,
  });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return `${CONNECTORS_PAGE_PATH}?${params.toString()}`;
}
