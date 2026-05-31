export type WaitlistFunnelEvent =
  | "homepage_view"
  | "waitlist_submit"
  | "waitlist_success";

type TrackProps = {
  roleSegment?: string;
};

/**
 * Fire-and-forget funnel events for ≥6% visitor-to-waitlist measurement.
 * Compare counts: homepage_view vs waitlist_success in marketing_funnel_events.
 */
export function trackWaitlistFunnel(
  event: WaitlistFunnelEvent,
  props?: TrackProps
): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    event,
    path: window.location.pathname,
    metadata: props ?? {},
  });

  const url = "/api/marketing/waitlist-funnel";

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      url,
      new Blob([payload], { type: "application/json" })
    );
    return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}
