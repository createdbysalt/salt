import type { PlaysTab } from "./load-plays-page-data";

export type PlaysActivityViewUi = "actions" | "captures";

export function playsTabCacheKey(tab: PlaysTab, activityView: PlaysActivityViewUi): string {
  if (tab !== "activity") {
    return tab;
  }
  return `activity:${activityView}`;
}

export function buildPlaysPath(
  tab: PlaysTab,
  queueFilter: "needs_you" | "auto_handled",
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
  queueFilter: "needs_you" | "auto_handled",
  activityView: PlaysActivityViewUi,
) {
  const path = buildPlaysPath(tab, queueFilter, activityView);
  window.history.replaceState(window.history.state, "", path);
}

export type CustomizeSectionUi = "playbooks" | "connectors";

export function syncPlaysCustomizeUrl(section: CustomizeSectionUi) {
  const params = new URLSearchParams();
  params.set("tab", "customize");
  if (section === "connectors") {
    params.set("customize", "connectors");
  }
  const query = params.toString();
  window.history.replaceState(window.history.state, "", `/plays?${query}`);
}
