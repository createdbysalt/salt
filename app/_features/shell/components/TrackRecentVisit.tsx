"use client";

import { useTrackRecentVisit } from "../hooks/useRecents";
import type { RecentItem } from "../types/recents";

interface TrackRecentVisitProps {
  item: Omit<RecentItem, "lastVisited">;
}

/**
 * Client component that tracks page visits for the recents sidebar section.
 * Include this component in detail pages to automatically add them to recents.
 *
 * @example
 * ```tsx
 * <TrackRecentVisit
 *   item={{
 *     id: client.id,
 *     type: "client",
 *     label: client.name,
 *     href: `/people/${client.id}`,
 *     subtitle: client.company_name,
 *   }}
 * />
 * ```
 */
export function TrackRecentVisit({ item }: TrackRecentVisitProps) {
  useTrackRecentVisit(item);
  return null;
}
