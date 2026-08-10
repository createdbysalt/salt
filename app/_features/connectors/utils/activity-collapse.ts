import type { ConnectorActivityEntry } from "../types";
import { activityDetailText } from "./activity-format";

/**
 * Collapse page-fetch noise (Connector Rules & Learning, P5).
 *
 * A background sync logs one execution row per provider page fetch, so a
 * 3-page Gmail pull rendered as three identical rows. Consecutive successful
 * background rows with the same slug AND the same translated detail group
 * into one ("Checked for new email — your inbox · 3 times"). Category-general
 * by construction: the group key is slug + rendered detail, with no provider
 * specifics. Interactive rows and errors never collapse — each is a distinct
 * event the user may want to inspect.
 */
export interface CollapsedActivityEntry {
  entry: ConnectorActivityEntry;
  count: number;
}

export function collapseConnectorActivity(
  entries: readonly ConnectorActivityEntry[],
): CollapsedActivityEntry[] {
  const collapsed: CollapsedActivityEntry[] = [];

  for (const entry of entries) {
    const previous = collapsed[collapsed.length - 1];
    if (
      previous &&
      previous.entry.source === "background" &&
      entry.source === "background" &&
      previous.entry.status === "success" &&
      entry.status === "success" &&
      previous.entry.toolSlug === entry.toolSlug &&
      (activityDetailText(previous.entry.argsSummary, {
        provider: previous.entry.provider,
      }) ?? null) ===
        (activityDetailText(entry.argsSummary, { provider: entry.provider }) ??
          null)
    ) {
      previous.count += 1;
      continue;
    }
    collapsed.push({ entry, count: 1 });
  }

  return collapsed;
}
