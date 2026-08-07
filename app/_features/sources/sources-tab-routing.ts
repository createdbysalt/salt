export type SourcesTab = "connectors" | "activity";

export function parseSourcesTab(value: string | null | undefined): SourcesTab {
  // "stream" is the pre-rename (2026-08-06) alias for the Activity tab.
  if (value === "activity" || value === "stream") return "activity";
  return "connectors";
}

export function buildSourcesPath(
  tab: SourcesTab,
  connector?: string | null,
): string {
  const params = new URLSearchParams();
  if (tab === "activity") {
    params.set("tab", "activity");
  }
  if (tab === "connectors" && connector) {
    params.set("connector", connector);
  }
  const query = params.toString();
  return query ? `/sources?${query}` : "/sources";
}

export function syncSourcesUrl(tab: SourcesTab, connector?: string | null) {
  window.history.replaceState(
    window.history.state,
    "",
    buildSourcesPath(tab, connector),
  );
}
