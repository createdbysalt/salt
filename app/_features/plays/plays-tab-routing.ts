import type { PlaysTab } from "./load-plays-page-data";

export type PlaysActivityViewUi = "actions" | "captures";
export type PlaysQueueFilterUi = "needs_you" | "auto_handled";

export function parsePlaysQueueFilter(value: string | null | undefined): PlaysQueueFilterUi {
  return value === "auto_handled" ? "auto_handled" : "needs_you";
}

export function playsTabCacheKey(tab: PlaysTab, activityView: PlaysActivityViewUi): string {
  if (tab !== "activity") {
    return tab;
  }
  return `activity:${activityView}`;
}

export function buildPlaysPath(
  tab: PlaysTab,
  queueFilter: PlaysQueueFilterUi,
  activityView: PlaysActivityViewUi,
): string {
  const params = new URLSearchParams();
  if (tab !== "queue") {
    params.set("tab", tab);
  }
  if (tab === "queue" && queueFilter === "auto_handled") {
    params.set("filter", "auto_handled");
  }
  if (tab === "activity" && activityView === "captures") {
    params.set("view", "captures");
  }
  const query = params.toString();
  return query ? `/plays?${query}` : "/plays";
}

export function syncPlaysUrl(
  tab: PlaysTab,
  queueFilter: PlaysQueueFilterUi,
  activityView: PlaysActivityViewUi,
) {
  const path = buildPlaysPath(tab, queueFilter, activityView);
  window.history.replaceState(window.history.state, "", path);
}

export type CustomizeSectionUi = "playbooks" | "connectors";

/**
 * Sync the Customize URL. When `connector` is set, the Connectors section is
 * showing that connector's detail (grid → detail happens in place, so the URL
 * stays under /plays and browser back returns to the grid).
 */
export function buildPlaysCustomizePath(
  section: CustomizeSectionUi,
  connector?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("tab", "customize");
  if (section === "connectors") {
    params.set("customize", "connectors");
    if (connector) {
      params.set("connector", connector);
    }
  }
  return `/plays?${params.toString()}`;
}

export function syncPlaysCustomizeUrl(
  section: CustomizeSectionUi,
  connector?: string | null,
) {
  window.history.replaceState(
    window.history.state,
    "",
    buildPlaysCustomizePath(section, connector),
  );
}
