import type { ActivityEntryRow } from "../types";
import type {
  ActivityCategory,
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

/** @deprecated Use mapActionToCategory instead */
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

/**
 * Map action + metadata to the new activity category.
 *
 * Categories:
 * - salt-acted: Salt did something autonomously
 * - you-decided: Human reviewed and made a call
 * - in-progress: Work staged, waiting to execute
 * - watching: Gathering evidence, not ready yet
 * - error: Something failed and needs attention
 */
function mapActionToCategory(
  action: string,
  metadata: Record<string, unknown> | null,
): ActivityCategory {
  switch (action) {
    // Error - failed automation or script execution
    case "failed":
    case "error":
      return "error";

    // Salt Acted - autonomous execution
    case "ran":
      if (metadata?.success === false || typeof metadata?.error === "string") {
        return "error";
      }
      // Check if auto-executed (no user approval) vs user-approved-then-ran
      return metadata?.auto_executed === true ? "salt-acted" : "you-decided";
    case "auto_applied":
    case "routed":
      return "salt-acted";

    // You Decided - human judgment
    case "approved":
    case "dismissed":
    case "acknowledged":
      return "you-decided";

    // Watching - evidence gathering
    case "accumulated":
    case "hold_for_threshold":
    case "resource_activity":
      return "watching";

    // In Progress - staged work (default)
    case "created":
      if (metadata?.source === "system_play" && metadata.auto_executed === true) {
        return "salt-acted";
      }
      return "in-progress";
    case "edited":
    case "scheduled":
    default:
      return "in-progress";
  }
}

function mapPlayerFromMetadata(
  metadata: Record<string, unknown> | null,
): PlayerId {
  const rawSlug = metadata?.playerSlug ?? metadata?.player_slug;
  // The retired "keeper" slug maps onto Memory Care.
  const slug = rawSlug === "keeper" ? "memory-care" : rawSlug;
  const allowed: PlayerId[] = [
    "follow-up",
    "brief",
    "client-risk",
    "scope",
    "billing",
    "memory-care",
  ];
  if (typeof slug === "string" && allowed.includes(slug as PlayerId)) {
    return slug as PlayerId;
  }
  return "follow-up";
}

function readMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readMetadataNumber(
  metadata: Record<string, unknown> | null,
  key: string,
): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" ? value : undefined;
}

function readMetadataStringArray(
  metadata: Record<string, unknown> | null,
  key: string,
): string[] | undefined {
  const value = metadata?.[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === "string");
  return strings.length > 0 ? strings : undefined;
}

function readMetadataBoolean(
  metadata: Record<string, unknown> | null,
  key: string,
): boolean | undefined {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : undefined;
}

export function mapActivityEntryForUi(row: ActivityEntryRow): ActivityEntry {
  const category = mapActionToCategory(row.action, row.metadata);

  return {
    id: row.id,
    time: formatTime(row.created_at),
    dayGroup: dayGroupFromIso(row.created_at),
    playerId: mapPlayerFromMetadata(row.metadata),
    title: row.title,
    target: row.detail ?? "—",
    playbook: row.action,
    status: mapActionToStatus(row.action),
    category,
    outcome: row.detail ?? undefined,
    sourceUrl: row.source_url ?? null,
    // Category-specific fields from metadata
    confidenceReason: readMetadataString(row.metadata, "confidence_reason"),
    evidenceSummary: readMetadataString(row.metadata, "evidence_summary"),
    confidencePercent: readMetadataNumber(row.metadata, "confidence_percent"),
    confidenceThreshold: readMetadataNumber(row.metadata, "confidence_threshold"),
    signals: readMetadataStringArray(row.metadata, "signals"),
    eta: readMetadataString(row.metadata, "eta"),
    sources: readMetadataStringArray(row.metadata, "sources"),
    reversible: readMetadataBoolean(row.metadata, "reversible"),
  };
}
