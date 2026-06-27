import type {
  ProfileFieldKey,
  ProfileFieldProvenanceView,
  ProfileProvenanceFeedItem,
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/profile/types";
import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import { formatRelationshipLabel } from "@/app/_features/plays/playbooks/profile/resolve-rules";

export type PersonActivityKind = "keeper" | "ai" | "salt" | "user" | "system";

export interface PersonActivityEvent {
  id: string;
  at: string;
  kind: PersonActivityKind;
  label: string;
  detail: string | null;
  field: ProfileFieldProvenanceView["field"];
  source: ProfileProvenanceSource;
  status: ProfileProvenanceStatus;
}

/** Shared row shape for person + playbook profile activity timelines. */
export type ProfileActivityTimelineEntry = {
  id: string;
  at: string;
  kind: PersonActivityKind;
  label: string;
  detail: string | null;
  field?: ProfileFieldKey;
  source?: ProfileProvenanceSource;
  status?: ProfileProvenanceStatus;
  entityName?: string | null;
  entityHref?: string | null;
};

export function profileFieldLabel(field: string): string {
  switch (field) {
    case "relationship_type":
      return "relationship";
    case "title":
      return "job title";
    case "org_link":
      return "organization";
    default:
      return field.replaceAll("_", " ");
  }
}

export type PersonActivityDayGroup = "Today" | "Yesterday" | "Earlier this week" | "Earlier";

export function personActivityDayGroup(iso: string): PersonActivityDayGroup {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "Earlier this week";
  return "Earlier";
}

export function formatPersonActivityTime(iso: string): string {
  const date = new Date(iso);
  if (personActivityDayGroup(iso) === "Today") {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function profileProvenanceStatusMeta(input: {
  status: ProfileProvenanceStatus;
  source: ProfileProvenanceSource;
}): {
  label: string;
  className: string;
} {
  if (input.status === "pending") {
    return {
      label: "Waiting",
      className: "bg-muted text-muted-foreground",
    };
  }
  if (input.source === "manual") {
    return {
      label: "Corrected",
      className: "bg-sky/15 text-sky",
    };
  }
  return {
    label: "Auto-applied",
    className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  };
}

export function personActivityStatusMeta(entry: PersonActivityEvent): {
  label: string;
  className: string;
} {
  return profileProvenanceStatusMeta(entry);
}

export function timelineEntryStatusMeta(
  entry: ProfileActivityTimelineEntry,
): { label: string; className: string } | null {
  if (entry.status == null || entry.source == null) return null;
  return profileProvenanceStatusMeta({ status: entry.status, source: entry.source });
}

export function buildPersonActivityAskSaltPrompt(
  entry: PersonActivityEvent,
  personName: string,
): string {
  const field = profileFieldLabel(entry.field);
  if (entry.status === "pending") {
    return `On ${personName}'s profile, Keeper suggested ${field}${entry.detail ? ` (${entry.detail})` : ""}. I want to review or change this.`;
  }
  return `On ${personName}'s profile: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. I want to review or change this.`;
}

export function normalizeLegacyActivityKind(
  kind: ActivityEvent["kind"] | PersonActivityKind | "salt",
): PersonActivityKind {
  if (kind === "salt" || kind === "ai") return "ai";
  if (kind === "user" || kind === "system") return kind;
  return "keeper";
}

export function mapActivityEventToTimelineEntry(
  entry: ActivityEvent,
): ProfileActivityTimelineEntry {
  return {
    id: entry.id,
    at: entry.at,
    kind: normalizeLegacyActivityKind(entry.kind),
    label: entry.label,
    detail: entry.detail ?? null,
  };
}

export function buildGenericRecordActivityAskSaltPrompt(
  recordLabel: string,
  entry: ProfileActivityTimelineEntry,
): string {
  return `On ${recordLabel}: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
}

export function buildPlaybookProvenanceAskSaltPrompt(
  entry: ProfileActivityTimelineEntry,
  playbookTitle: string,
): string {
  const who = entry.entityName ?? "this person";
  const field = entry.field ? profileFieldLabel(entry.field) : "profile field";
  if (entry.status === "pending") {
    return `${playbookTitle} playbook: for ${who}, Keeper suggested ${field}${entry.detail ? ` (${entry.detail})` : ""}. I want to review this fill.`;
  }
  return `${playbookTitle} playbook: for ${who}, "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. I want to review this fill.`;
}

export function mapProvenanceFeedItemToTimelineEntry(
  item: ProfileProvenanceFeedItem,
): ProfileActivityTimelineEntry {
  const event = mapProvenanceToActivity({
    field: item.field,
    value: item.value,
    source: item.source,
    ruleId: null,
    confidence: null,
    because: item.because,
    status: item.status,
    evidence: {},
    setAt: item.setAt,
  });

  const fieldLabel = profileFieldLabel(item.field);
  const valueLabel =
    item.field === "relationship_type"
      ? formatRelationshipLabel(item.value)
      : item.value ?? "—";
  const detailParts = [`${fieldLabel} → ${valueLabel}`, item.because].filter(Boolean);

  return {
    id: item.id,
    at: item.setAt,
    kind: event.kind,
    label: event.label,
    detail: detailParts.join(" · "),
    field: item.field,
    source: item.source,
    status: item.status,
    entityName: item.entityName,
    entityHref: item.entityHref,
  };
}

/**
 * Synthesizes a Salt-authored Activity entry from the cached AI narrative so
 * the "Salt generated this" provenance lives in the Activity log instead of as
 * chrome on the Overview tab. Returns null when no AI narrative is in play.
 */
export function buildNarrativeActivityTimelineEntry(
  narrative: FreshRecordNarrative | null | undefined,
): ProfileActivityTimelineEntry | null {
  if (!narrative?.generatedAt) return null;
  return {
    id: `ai-summary-${narrative.generatedAt}`,
    at: narrative.generatedAt,
    kind: "ai",
    label: "Salt refreshed the summary",
    detail: "Rewrote the Summary and Worth attention from your latest signals.",
  };
}

/**
 * Merges the AI-narrative provenance entry into an Activity timeline and sorts
 * newest-first. Pure helper shared by the People / Org / Work activity tabs.
 */
export function withNarrativeActivityEntry(
  entries: ProfileActivityTimelineEntry[],
  narrative: FreshRecordNarrative | null | undefined,
): ProfileActivityTimelineEntry[] {
  const narrativeEntry = buildNarrativeActivityTimelineEntry(narrative);
  const merged = narrativeEntry ? [narrativeEntry, ...entries] : entries;
  return merged
    .slice()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function groupPersonActivityByDay<T extends { at: string }>(
  entries: T[],
): Array<[PersonActivityDayGroup, T[]]> {
  const order: PersonActivityDayGroup[] = [
    "Today",
    "Yesterday",
    "Earlier this week",
    "Earlier",
  ];
  const map = new Map<PersonActivityDayGroup, T[]>();
  for (const entry of entries) {
    const day = personActivityDayGroup(entry.at);
    const bucket = map.get(day) ?? [];
    bucket.push(entry);
    map.set(day, bucket);
  }
  return order
    .filter((day) => map.has(day))
    .map((day) => [day, map.get(day)!]);
}

export function mapProvenanceToActivity(
  provenance: ProfileFieldProvenanceView,
): PersonActivityEvent {
  const field = profileFieldLabel(provenance.field);
  const confidence = provenance.confidence != null ? `${provenance.confidence}% sure` : null;
  const detailParts = [provenance.because ?? "Based on trusted person-record evidence.", confidence].filter(Boolean);

  if (provenance.source === "manual") {
    return {
      id: `profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "user",
      label: `You updated ${field}`,
      detail: detailParts.join(" · "),
      field: provenance.field,
      source: provenance.source,
      status: provenance.status,
    };
  }

  if (provenance.source === "ai_fallback") {
    const action = provenance.status === "pending" ? "suggested" : "inferred";
    return {
      id: `profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "keeper",
      label: `Keeper ${action} ${field}`,
      detail: detailParts.join(" · "),
      field: provenance.field,
      source: provenance.source,
      status: provenance.status,
    };
  }

  const action = provenance.status === "pending" ? "suggested" : "updated";
  return {
    id: `profile-${provenance.field}-${provenance.setAt}`,
    at: provenance.setAt,
    kind: "keeper",
    label: `Keeper ${action} ${field}`,
    detail: detailParts.join(" · "),
    field: provenance.field,
    source: provenance.source,
    status: provenance.status,
  };
}
