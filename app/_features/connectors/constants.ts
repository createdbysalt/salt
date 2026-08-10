export const CONNECTORS_PAGE_PATH = "/sources";

/**
 * Canonical URL for the Connectors surface — Sources → Connectors.
 * Pass `connector` to deep-link a specific connector's detail, or any extra
 * query params (e.g. OAuth result flags).
 */
export function connectorsPageUrl(
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${CONNECTORS_PAGE_PATH}?${query}` : CONNECTORS_PAGE_PATH;
}

/**
 * Reconnect CTA target: deep-link a single expired connector, otherwise the
 * connectors list so the user can fix several.
 */
export function reconnectNeededHref(
  items: Array<{ catalogId: string }>,
): string {
  if (items.length === 1) {
    return connectorsPageUrl({ connector: items[0].catalogId });
  }
  return connectorsPageUrl();
}
