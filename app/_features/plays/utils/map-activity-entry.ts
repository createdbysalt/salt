import type { ActivityEntryRow } from "../types";
import type {
  ActivityEntry,
  ActivityStatus,
  PlayerId,
} from "@/app/_lib/demo/plays-demo-data";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function dayGroupFromIso(iso: string): ActivityEntry["dayGroup"] {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDay = new Date(date);
  entryDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - entryDay.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier this week";
}

function mapActionToStatus(action: string): ActivityStatus {
  switch (action) {
    case "approved":
    case "ran":
      return "approved";
    case "dismissed":
      return "dismissed";
    case "scheduled":
      return "scheduled";
    case "auto_applied":
      return "auto-applied";
    default:
      return "pending";
  }
}

function mapPlayerFromMetadata(
  metadata: Record<string, unknown> | null,
): PlayerId {
  const slug = metadata?.playerSlug;
  const allowed: PlayerId[] = [
    "follow-up",
    "brief",
    "client-risk",
    "scope",
    "billing",
  ];
  if (typeof slug === "string" && allowed.includes(slug as PlayerId)) {
    return slug as PlayerId;
  }
  return "follow-up";
}

export function mapActivityEntryForUi(row: ActivityEntryRow): ActivityEntry {
  return {
    id: row.id,
    time: formatTime(row.created_at),
    dayGroup: dayGroupFromIso(row.created_at),
    playerId: mapPlayerFromMetadata(row.metadata),
    title: row.title,
    target: row.detail ?? "—",
    playbook: row.action,
    status: mapActionToStatus(row.action),
    outcome: row.detail ?? undefined,
  };
}
