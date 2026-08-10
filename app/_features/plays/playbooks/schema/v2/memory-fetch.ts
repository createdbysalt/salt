import "server-only";

/**
 * Memory fetch source for the v2 playbook executor.
 *
 * "memory" is not a connector category — it's Salt's own Memory tables
 * (people, work, blockers). Playbooks like follow-up, relationship-health,
 * and blocker-watch fetch from it via `fetch from: memory.<capability>`,
 * which the executor routes here instead of through the Composio category
 * fetcher. No connected-category requirement applies.
 *
 * Capabilities:
 * - person_context: one person with relationship context. Signal-scoped —
 *   resolves the person from the triggering entity id.
 * - silent_relationships: people whose last_contact_at is older than
 *   `where.days_since_contact` (default 30).
 * - silent_30d: same query, fixed at 30 days (daily-briefing).
 * - work_blocked: unresolved work blockers. Signal-scoped to a work entity
 *   returns a single object; otherwise returns the list.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export interface MemoryFetchEntityContext {
  entityId?: string;
  entitySurface?: string;
}

export function isMemoryFetchCategory(category: string): boolean {
  return category === "memory";
}

export async function fetchMemorySource(
  workspaceId: string,
  capability: string,
  where: Record<string, unknown> | undefined,
  entity: MemoryFetchEntityContext
): Promise<unknown> {
  switch (capability) {
    case "person_context":
      return fetchPersonContext(workspaceId, entity);
    case "silent_relationships":
      return fetchSilentRelationships(workspaceId, daysFrom(where, 30));
    case "silent_30d":
      return fetchSilentRelationships(workspaceId, 30);
    case "work_blocked":
      return fetchWorkBlocked(workspaceId, entity);
    default:
      throw new Error(`Unknown memory capability "${capability}"`);
  }
}

function daysFrom(
  where: Record<string, unknown> | undefined,
  fallback: number
): number {
  const raw = where?.days_since_contact;
  return typeof raw === "number" && raw > 0 ? raw : fallback;
}

export interface PersonContext {
  id: string;
  name: string;
  email: string | null;
  relationship_type: string | null;
  relationship_status: string | null;
  last_contact_at: string | null;
  first_contact_at: string | null;
  recent_notes: string | null;
  health_band: string | null;
  health_score: number | null;
  has_calendar_meeting: boolean;
}

/**
 * Single-object result (not an array) so templates can reference
 * `{{contact_context.name}}` and classify rules test fields directly.
 */
async function fetchPersonContext(
  workspaceId: string,
  entity: MemoryFetchEntityContext
): Promise<PersonContext> {
  if (entity.entitySurface !== "person" || !entity.entityId) {
    throw new Error(
      "memory.person_context requires a person entity in the trigger context"
    );
  }

  const admin = createAdminClient();
  const { data: person, error } = await admin
    .from("people")
    .select(
      "id, name, email, relationship_type, relationship_status, last_contact_at, first_contact_at, notes, relationship_health_band, relationship_health_score"
    )
    .eq("id", entity.entityId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load person ${entity.entityId}: ${error.message}`);
  }
  if (!person) {
    throw new Error(`Person ${entity.entityId} not found in workspace`);
  }

  const { count: meetingCount } = await admin
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("person_id", person.id as string)
    .is("deleted_at", null)
    .limit(1);

  return {
    id: person.id as string,
    name: person.name as string,
    email: (person.email as string) ?? null,
    relationship_type: (person.relationship_type as string) ?? null,
    relationship_status: (person.relationship_status as string) ?? null,
    last_contact_at: (person.last_contact_at as string) ?? null,
    first_contact_at: (person.first_contact_at as string) ?? null,
    recent_notes: (person.notes as string) ?? null,
    health_band: (person.relationship_health_band as string) ?? null,
    health_score: (person.relationship_health_score as number) ?? null,
    has_calendar_meeting: (meetingCount ?? 0) > 0,
  };
}

export interface SilentRelationship {
  id: string;
  name: string;
  relationship_type: string | null;
  last_contact_at: string | null;
  days_since_contact: number | null;
}

async function fetchSilentRelationships(
  workspaceId: string,
  days: number
): Promise<SilentRelationship[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("people")
    .select("id, name, relationship_type, last_contact_at")
    .eq("workspace_id", workspaceId)
    .lt("last_contact_at", cutoff.toISOString())
    .is("archived_at", null)
    .is("deleted_at", null)
    .order("last_contact_at", { ascending: true })
    .limit(25);

  if (error) {
    throw new Error(`Failed to load silent relationships: ${error.message}`);
  }

  const now = Date.now();
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    relationship_type: (row.relationship_type as string) ?? null,
    last_contact_at: (row.last_contact_at as string) ?? null,
    days_since_contact: row.last_contact_at
      ? Math.floor(
          (now - new Date(row.last_contact_at as string).getTime()) /
            (24 * 60 * 60 * 1000)
        )
      : null,
  }));
}

export interface BlockedWorkItem {
  id: string;
  name: string;
  blocker_reason: string;
  blocker_type: string;
  blocked_since: string;
}

/**
 * Signal-scoped (work entity in trigger context): the blocked work item as a
 * single object so `{{blocked_work.name}}` resolves. Otherwise the workspace's
 * unresolved blockers as a list.
 */
async function fetchWorkBlocked(
  workspaceId: string,
  entity: MemoryFetchEntityContext
): Promise<BlockedWorkItem | BlockedWorkItem[]> {
  const admin = createAdminClient();

  const scopedWorkId =
    entity.entitySurface === "work" ? entity.entityId : undefined;

  const base = admin
    .from("work_blockers")
    .select("work_id, title, blocker_type, detail, detected_at, work:work_id(title)")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null);

  const filtered = scopedWorkId ? base.eq("work_id", scopedWorkId) : base;

  const { data, error } = await filtered
    .order("detected_at", { ascending: false })
    .limit(25);
  if (error) {
    throw new Error(`Failed to load blocked work: ${error.message}`);
  }

  const items: BlockedWorkItem[] = (data ?? []).map((row) => {
    const work = row.work as { title?: string } | null;
    return {
      id: row.work_id as string,
      name: work?.title ?? "Work item",
      blocker_reason: (row.detail as string) ?? (row.title as string),
      blocker_type: row.blocker_type as string,
      blocked_since: row.detected_at as string,
    };
  });

  if (scopedWorkId) {
    const first = items[0];
    if (!first) {
      throw new Error(
        `Work ${scopedWorkId} has no unresolved blocker (signal may be stale)`
      );
    }
    return first;
  }

  return items;
}
