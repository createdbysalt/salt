"use client";

import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { formatDistanceToNow, startOfDay } from "date-fns";
import type { ConnectorActivityEntry } from "@/app/_features/connectors";
import {
  activityActionLabel,
  activityDetailText,
  activityFriendlyError,
} from "@/app/_features/connectors/utils/activity-format";
import { collapseConnectorActivity } from "@/app/_features/connectors/utils/activity-collapse";
import { ConnectorActivityListSkeleton } from "./ConnectorDetailPaneSkeleton";

const ACTIVITY_SOURCE_LABELS: Record<ConnectorActivityEntry["source"], string> = {
  ask_salt: "Ask Salt",
  server_action: "App action",
  background: "Background",
  play: "Play",
};

export type ActivityTimeFilter = "all" | "today" | "7d" | "30d";

export const ACTIVITY_TIME_FILTERS: readonly {
  value: ActivityTimeFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];


export function filterConnectorActivity(
  entries: ConnectorActivityEntry[],
  query: string,
  timeFilter: ActivityTimeFilter,
): ConnectorActivityEntry[] {
  const normalized = query.trim().toLowerCase();
  const now = Date.now();
  const cutoffs: Record<ActivityTimeFilter, number | null> = {
    all: null,
    today: startOfDay(new Date()).getTime(),
    "7d": now - 7 * 24 * 60 * 60 * 1000,
    "30d": now - 30 * 24 * 60 * 60 * 1000,
  };
  const cutoff = cutoffs[timeFilter];

  return entries.filter((entry) => {
    if (cutoff !== null && new Date(entry.createdAt).getTime() < cutoff) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    const haystack = [
      entry.toolSlug,
      activityActionLabel(entry),
      ACTIVITY_SOURCE_LABELS[entry.source],
      entry.status,
      entry.error ?? "",
      activityDetailText(entry.argsSummary, { provider: entry.provider }) ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

function activityStatusIcon(status: ConnectorActivityEntry["status"]) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} />;
    case "error":
      return <XCircle className="size-4 text-destructive" strokeWidth={1.75} />;
    case "blocked":
      return <ShieldAlert className="size-4 text-warning" strokeWidth={1.75} />;
  }
}

export function ConnectorActivityList({
  entries,
  loading,
  filteredEmpty = false,
}: {
  entries: ConnectorActivityEntry[] | null;
  loading: boolean;
  /** True when filters/search removed every row but the connector has activity. */
  filteredEmpty?: boolean;
}) {
  if (loading || entries === null) {
    return <ConnectorActivityListSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-1 py-6">
        <p className="text-sm font-medium text-foreground">
          {filteredEmpty ? "No matching activity" : "No activity yet"}
        </p>
        <p className="text-sm text-muted-foreground">
          {filteredEmpty
            ? "Try a different search or time range."
            : "Salt records every action it takes with this connector — reads, approved sends, and anything it blocked."}
        </p>
      </div>
    );
  }

  const collapsed = collapseConnectorActivity(entries);

  return (
    <ul className="divide-y divide-border/40">
      {collapsed.map(({ entry, count }) => {
        const detail = activityDetailText(entry.argsSummary, {
          provider: entry.provider,
        });
        const friendlyError = activityFriendlyError(entry);
        return (
          <li key={entry.id} className="flex gap-3 py-3 first:pt-0">
            <div className="mt-0.5 shrink-0">{activityStatusIcon(entry.status)}</div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-[13px] font-medium text-foreground">
                  {activityActionLabel(entry)}
                  {detail ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      {detail}
                    </span>
                  ) : null}
                  {count > 1 ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {count} times
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ACTIVITY_SOURCE_LABELS[entry.source]}
                  {entry.approvedBy ? " · approved" : ""}
                  {" · "}
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </div>
              {entry.status === "error" && friendlyError ? (
                <p className="text-xs text-destructive">{friendlyError}</p>
              ) : null}
              {/* Raw tool slugs, inputs, and vendor error text are platform-ops
                  detail — they stay in the activity_entries row for the
                  founder, not in user UI. */}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
