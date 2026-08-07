import type { PlaysTab } from "./load-plays-page-data";

/** Queue filter: Needs You / Auto-handled. */
export type PlaysQueueFilterUi = "needs_you" | "auto_handled";

export function parsePlaysQueueFilter(value: string | null | undefined): PlaysQueueFilterUi {
  if (value === "auto_handled") return "auto_handled";
  return "needs_you";
}

export function buildPlaysPath(
  tab: PlaysTab,
  queueFilter: PlaysQueueFilterUi,
): string {
  const params = new URLSearchParams();
  if (tab !== "queue") {
    params.set("tab", tab);
  }
  if (tab === "queue" && queueFilter !== "needs_you") {
    params.set("filter", queueFilter);
  }
  const query = params.toString();
  return query ? `/plays?${query}` : "/plays";
}

export function syncPlaysUrl(
  tab: PlaysTab,
  queueFilter: PlaysQueueFilterUi,
) {
  const path = buildPlaysPath(tab, queueFilter);
  window.history.replaceState(window.history.state, "", path);
}

/**
 * Resolve pre-reorg (2026-08-06) Plays URLs to their new homes:
 * - Customize → Connectors moved to Sources (/sources)
 * - Activity → Captures moved to Sources → Activity (/sources?tab=activity)
 * - Queue → Watching (learning) moved to Memory → Filter (/memory?tab=filter)
 * - tab=customize renamed to tab=playbooks
 *
 * Returns the redirect target, or null when the URL is already canonical.
 */
export function resolvePlaysLegacyRedirect(params: {
  tab?: string | null;
  filter?: string | null;
  view?: string | null;
  customize?: string | null;
  connector?: string | null;
}): string | null {
  if (params.tab === "customize") {
    if (params.customize === "connectors" || params.connector) {
      const search = new URLSearchParams();
      if (params.connector) search.set("connector", params.connector);
      const query = search.toString();
      return query ? `/sources?${query}` : "/sources";
    }
    if (params.customize === "voices" || params.customize === "players") {
      return "/me?tab=voice";
    }
    return "/plays?tab=playbooks";
  }

  if (params.view === "captures" || params.view === "stream") {
    return "/sources?tab=activity";
  }

  if (params.filter === "learning") {
    return "/memory?tab=filter";
  }

  return null;
}
