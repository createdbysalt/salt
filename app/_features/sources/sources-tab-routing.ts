import { CATEGORY_TO_AREA } from "@/app/_features/capture/adapters/rule-entities";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";

export type SourcesTab = "connectors" | "activity" | "customize";

export function parseSourcesTab(value: string | null | undefined): SourcesTab {
  // "stream" is the pre-rename (2026-08-06) alias for the Activity tab.
  if (value === "activity" || value === "stream") return "activity";
  if (value === "customize") return "customize";
  return "connectors";
}

/**
 * The Customize tab's category param. "all" is the workspace-wide rules
 * view; anything else is an intake AREA key (email, messaging, projects…),
 * validated by the tab against the connected accounts (unknown keys fall
 * back to the first connected area). Legacy ConnectorCategory keys
 * ("communication", "project_management", "documents") normalize to their
 * area so pre-area deep links keep landing right.
 */
export function parseCustomizeCategory(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  const legacy = CATEGORY_TO_AREA[trimmed as ConnectorCategory] as
    | string
    | undefined;
  return legacy ?? trimmed;
}

export function buildSourcesPath(
  tab: SourcesTab,
  connector?: string | null,
  category?: string | null,
): string {
  const params = new URLSearchParams();
  if (tab === "activity") {
    params.set("tab", "activity");
  }
  if (tab === "customize") {
    params.set("tab", "customize");
    if (category) {
      params.set("category", category);
    }
  }
  if (tab === "connectors" && connector) {
    params.set("connector", connector);
  }
  const query = params.toString();
  return query ? `/sources?${query}` : "/sources";
}

export function syncSourcesUrl(
  tab: SourcesTab,
  connector?: string | null,
  category?: string | null,
) {
  window.history.replaceState(
    window.history.state,
    "",
    buildSourcesPath(tab, connector, category),
  );
}
