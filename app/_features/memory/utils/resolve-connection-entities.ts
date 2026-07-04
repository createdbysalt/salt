import type { SupabaseClient } from "@supabase/supabase-js";

export type EntityLinkRow = {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relation_type: string | null;
  created_at: string;
  created_by: string | null;
};

export type ResolvedConnectionEntity = {
  name: string;
  href: string;
};

export const CONNECTION_ENTITY_TYPE_LABELS: Record<string, string> = {
  person: "person",
  org: "organization",
  work: "work",
  billing: "payment",
  note: "note",
  conversation: "conversation",
  meeting: "meeting",
  file: "file",
  space: "space",
};

export const UNRESOLVED_CONNECTION_LABEL = "Record unavailable";

export function connectionEntityTypeLabel(entityType: string): string {
  return CONNECTION_ENTITY_TYPE_LABELS[entityType] ?? entityType.replace(/_/g, " ");
}

export function formatNoteDisplayName(note: {
  title: string | null;
  content: string | null;
}): string {
  if (note.title?.trim()) return note.title.trim();
  const content = note.content?.trim();
  if (content) {
    return content.length > 60 ? `${content.slice(0, 60)}…` : content;
  }
  return "Untitled note";
}

export function formatBillingDisplayName(record: {
  number: string | null;
  direction: string;
  id: string;
}): string {
  return (
    record.number ||
    `${record.direction === "receivable" ? "INV" : "BILL"}-${record.id.slice(0, 6)}`
  );
}

export function connectionEntityHref(entityType: string, entityId: string): string {
  switch (entityType) {
    case "person":
      return `/people/${entityId}`;
    case "org":
      return `/orgs/${entityId}`;
    case "work":
      return `/work/${entityId}`;
    case "meeting":
      return `/meetings/${entityId}`;
    case "billing":
      return `/billing/${entityId}`;
    case "conversation":
      return `/conversations/${entityId}`;
    case "file":
      return `/files?preview=${entityId}`;
    default:
      return "";
  }
}

/** Notes' own entity_type column still uses the long dialect (organization, client_meeting, …). */
const NOTE_ENTITY_TYPE_TO_SHORT: Record<string, string> = {
  person: "person",
  organization: "org",
  org: "org",
  work: "work",
  project: "work",
  meeting: "meeting",
  client_meeting: "meeting",
  billing_record: "billing",
  billing: "billing",
  conversation: "conversation",
  file: "file",
};

function noteEntityHref(note: {
  entity_type: string | null;
  entity_id: string | null;
}): string {
  if (!note.entity_type || !note.entity_id) return "";
  const shortType = NOTE_ENTITY_TYPE_TO_SHORT[note.entity_type];
  if (!shortType) return "";
  return connectionEntityHref(shortType, note.entity_id);
}

export async function buildConnectionEntityNameMap(
  supabase: SupabaseClient,
  rows: EntityLinkRow[],
  thisEntityType: string,
  thisEntityId: string,
): Promise<Map<string, ResolvedConnectionEntity>> {
  const peopleIds: string[] = [];
  const orgIds: string[] = [];
  const workIds: string[] = [];
  const meetingIds: string[] = [];
  const noteIds: string[] = [];
  const billingIds: string[] = [];

  for (const row of rows) {
    const isOutgoing =
      row.source_type === thisEntityType && row.source_id === thisEntityId;
    const otherType = isOutgoing ? row.target_type : row.source_type;
    const otherId = isOutgoing ? row.target_id : row.source_id;

    switch (otherType) {
      case "person":
        peopleIds.push(otherId);
        break;
      case "org":
        orgIds.push(otherId);
        break;
      case "work":
        workIds.push(otherId);
        break;
      case "meeting":
        meetingIds.push(otherId);
        break;
      case "note":
        noteIds.push(otherId);
        break;
      case "billing":
        billingIds.push(otherId);
        break;
    }
  }

  const [peopleResult, orgsResult, workResult, meetingsResult, notesResult, billingResult] =
    await Promise.all([
      peopleIds.length > 0
        ? supabase.from("people").select("id, name").in("id", peopleIds)
        : { data: [] },
      orgIds.length > 0
        ? supabase.from("organizations").select("id, name").in("id", orgIds)
        : { data: [] },
      workIds.length > 0
        ? supabase.from("projects").select("id, name").in("id", workIds)
        : { data: [] },
      meetingIds.length > 0
        ? supabase.from("client_meetings").select("id, title").in("id", meetingIds)
        : { data: [] },
      noteIds.length > 0
        ? supabase
            .from("notes")
            .select("id, title, content, entity_type, entity_id")
            .in("id", noteIds)
        : { data: [] },
      billingIds.length > 0
        ? supabase
            .from("billing_records")
            .select("id, number, direction")
            .in("id", billingIds)
        : { data: [] },
    ]);

  const nameMap = new Map<string, ResolvedConnectionEntity>();

  for (const person of peopleResult.data ?? []) {
    nameMap.set(`person:${person.id}`, {
      name: person.name,
      href: connectionEntityHref("person", person.id),
    });
  }

  for (const org of orgsResult.data ?? []) {
    nameMap.set(`org:${org.id}`, {
      name: org.name,
      href: connectionEntityHref("org", org.id),
    });
  }

  for (const work of workResult.data ?? []) {
    nameMap.set(`work:${work.id}`, {
      name: work.name,
      href: connectionEntityHref("work", work.id),
    });
  }

  for (const meeting of meetingsResult.data ?? []) {
    nameMap.set(`meeting:${meeting.id}`, {
      name: meeting.title?.trim() || "Untitled meeting",
      href: connectionEntityHref("meeting", meeting.id),
    });
  }

  for (const note of notesResult.data ?? []) {
    nameMap.set(`note:${note.id}`, {
      name: formatNoteDisplayName(note),
      href: noteEntityHref(note),
    });
  }

  for (const billing of billingResult.data ?? []) {
    nameMap.set(`billing:${billing.id}`, {
      name: formatBillingDisplayName(billing),
      href: connectionEntityHref("billing", billing.id),
    });
  }

  return nameMap;
}

export function resolveConnectionEntityFromMap(
  nameMap: Map<string, ResolvedConnectionEntity>,
  entityType: string,
  entityId: string,
): ResolvedConnectionEntity | undefined {
  return nameMap.get(`${entityType}:${entityId}`);
}
