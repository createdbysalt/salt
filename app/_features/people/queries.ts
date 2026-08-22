import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { RelationshipType } from "@/app/_features/memory/records/types";
import type {
  PersonProfileFieldsView,
  ProfileFieldProvenanceView,
} from "@/app/_features/plays/playbooks/records-engine/types";
import {
  mapProvenanceToActivity,
  type PersonActivityEvent,
} from "@/app/_features/people/utils/activity";
import { mapNoteToActivityEntry } from "@/app/_features/work/utils/activity";
import { mapNoteRow } from "@/app/_features/memory/types/taxonomies";
import {
  buildConnectionEntityNameMap,
  connectionEntityTypeLabel,
  resolveConnectionEntityFromMap,
  UNRESOLVED_CONNECTION_LABEL,
  type EntityLinkRow,
} from "@/app/_features/memory/utils/resolve-connection-entities";
import type { RelationshipHealthResult } from "@/app/_features/people/health/types";
import type { CachedRecordNarrativeRow } from "@/app/_features/memory/utils/record-narrative-cache";
import { recomputeRelationshipHealth } from "@/app/_features/people/health/recompute";
import { ARCHETYPE_DISPLAY_LABEL } from "@/app/_features/people/health/archetypes";
import { HEALTH_FRESHNESS_MS } from "@/app/_features/people/health/types";
export type { RelationshipHealthResult };

export interface PersonDetailSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingEmail: string | null;
  timezone: string | null;
  title: string | null;
  relationshipType: RelationshipType | null;
  relationshipStatus: string | null;
  primaryOrg: { id: string; name: string } | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  lastContactAt: string | null;
  createdAt: string | null;
  recordStatus: "active" | "inactive";
  metrics: {
    activeWork: number;
    outstandingCents: number;
    meetingWithinDays: number | null;
    mrrCents: number | null;
    retainerLabel: string | null;
  };
  updatedAt: string | null;
  narrativeCache: CachedRecordNarrativeRow;
}

async function getPersonWorkMetrics(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  personId: string;
}): Promise<PersonDetailSummary["metrics"]> {
  const now = new Date();
  const [projectsResult, billingResult, retainersResult, nextMeetingResult] =
    await Promise.all([
      input.supabase
        .from("work")
        .select("id", { count: "exact", head: true })
        .eq("person_id", input.personId)
        .in("status", ["signed", "active"]),
      input.supabase
        .from("billing_records")
        .select("amount_cents, amount_paid_cents")
        .eq("person_id", input.personId)
        .eq("direction", "receivable")
        .in("status", ["due", "overdue", "partial"]),
      input.supabase
        .from("work")
        .select("name, retainer_mrr_cents")
        .eq("person_id", input.personId)
        .eq("work_type", "retainer")
        .in("status", ["signed", "active"]),
      input.supabase
        .from("meetings")
        .select("start_time")
        .eq("person_id", input.personId)
        .eq("status", "scheduled")
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const outstandingCents = (billingResult.data ?? []).reduce(
    (sum, record) =>
      sum +
      Math.max(
        0,
        ((record.amount_cents as number | null) ?? 0) -
          ((record.amount_paid_cents as number | null) ?? 0),
      ),
    0,
  );
  const activeRetainers = retainersResult.data ?? [];
  const mrrCents = activeRetainers.reduce(
    (sum, retainer) => sum + ((retainer.retainer_mrr_cents as number | null) ?? 0),
    0,
  );
  const retainerLabel =
    (activeRetainers[0]?.name as string | null) ??
    (activeRetainers.length > 0 ? "Active retainer" : null);
  const nextMeetingAt = nextMeetingResult.data?.start_time
    ? new Date(nextMeetingResult.data.start_time as string)
    : null;
  const meetingWithinDays = nextMeetingAt
    ? Math.max(0, Math.ceil((nextMeetingAt.getTime() - now.getTime()) / 86400000))
    : null;

  return {
    activeWork: projectsResult.count ?? 0,
    outstandingCents,
    meetingWithinDays,
    mrrCents: mrrCents > 0 ? mrrCents : null,
    retainerLabel,
  };
}

function mapProvenanceRow(row: Record<string, unknown>): ProfileFieldProvenanceView {
  const valueObj = row.value as { text?: string } | null;
  return {
    field: row.field as ProfileFieldProvenanceView["field"],
    value: valueObj?.text ?? null,
    source: row.source as ProfileFieldProvenanceView["source"],
    ruleId: (row.rule_id as string | null) ?? null,
    confidence: (row.confidence as number | null) ?? null,
    because: typeof row.evidence === "object" && row.evidence && "because" in (row.evidence as object)
      ? String((row.evidence as { because?: string }).because)
      : null,
    status: row.status as ProfileFieldProvenanceView["status"],
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    setAt: row.set_at as string,
  };
}

function getPrimaryOrg(
  orgLinks:
    | {
        is_primary: boolean | null;
        organization: { id: string; name: string } | { id: string; name: string }[] | null;
      }[]
    | null,
): { id: string; name: string } | null {
  const primary =
    orgLinks?.find((link) => link.is_primary && link.organization)?.organization ??
    orgLinks?.find((link) => link.organization)?.organization;
  if (Array.isArray(primary)) return primary[0] ?? null;
  return primary ?? null;
}

export const getPersonDetailSummary = cache(
  async (personId: string): Promise<PersonDetailSummary | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: person, error } = await supabase
      .from("people")
      .select(
        "id, name, email, phone, billing_email, timezone, title, relationship_type, relationship_status, record_status, address_line_1, address_line_2, city, state, postal_code, country, last_contact_at, created_at, updated_at, ai_summary, ai_worth_attention, ai_worth_attention_play, ai_summary_inputs_hash, ai_summary_model, ai_summary_generated_at",
      )
      .eq("id", personId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !person) return null;

    const { data: orgLinks } = await supabase
      .from("organization_people")
      .select("is_primary, organization:organizations(id, name)")
      .eq("person_id", personId);
    const metrics = await getPersonWorkMetrics({
      supabase,
      personId: person.id,
    });

    return {
      id: person.id,
      name: person.name,
      email: (person.email as string | null) ?? null,
      phone: (person.phone as string | null) ?? null,
      billingEmail: (person.billing_email as string | null) ?? null,
      timezone: (person.timezone as string | null) ?? null,
      title: (person.title as string | null) ?? null,
      relationshipType: (person.relationship_type as RelationshipType | null) ?? null,
      relationshipStatus: (person.relationship_status as string | null) ?? null,
      primaryOrg: getPrimaryOrg(orgLinks),
      addressLine1: (person.address_line_1 as string | null) ?? null,
      addressLine2: (person.address_line_2 as string | null) ?? null,
      city: (person.city as string | null) ?? null,
      state: (person.state as string | null) ?? null,
      postalCode: (person.postal_code as string | null) ?? null,
      country: (person.country as string | null) ?? null,
      lastContactAt: (person.last_contact_at as string | null) ?? null,
      createdAt: (person.created_at as string | null) ?? null,
      recordStatus: (person.record_status as "active" | "inactive" | null) ?? "active",
      metrics,
      updatedAt: (person.updated_at as string | null) ?? null,
      narrativeCache: {
        ai_summary: (person.ai_summary as string | null) ?? null,
        ai_worth_attention: (person.ai_worth_attention as string | null) ?? null,
        ai_worth_attention_play: (person.ai_worth_attention_play as string | null) ?? null,
        ai_summary_inputs_hash: (person.ai_summary_inputs_hash as string | null) ?? null,
        ai_summary_model: (person.ai_summary_model as string | null) ?? null,
        ai_summary_generated_at: (person.ai_summary_generated_at as string | null) ?? null,
      },
    };
  },
);

export const getPersonActivity = cache(
  async (personId: string): Promise<PersonActivityEvent[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const [provenanceResult, connectionResult, noteResult] = await Promise.all([
      supabase
        .from("profile_field_provenance")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("entity_type", "person")
        .eq("entity_id", personId)
        .order("set_at", { ascending: false }),
      supabase
        .from("entity_links")
        .select("id, source_type, source_id, target_type, target_id, relation_type, created_at, created_by")
        .eq("workspace_id", workspace.id)
        .or(`and(source_type.eq.person,source_id.eq.${personId}),and(target_type.eq.person,target_id.eq.${personId})`)
        .order("created_at", { ascending: false }),
      supabase
        .from("notes")
        .select("id, title, content, note_kind, source, source_ref, confidence, status, author_type, is_pinned, tags, created_at")
        .eq("workspace_id", workspace.id)
        .eq("entity_type", "person")
        .eq("entity_id", personId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    const provenanceEntries = (provenanceResult.data ?? [])
      .map((row) => mapProvenanceRow(row as Record<string, unknown>))
      .map(mapProvenanceToActivity);

    const connectionEntries = await resolvePersonConnectionActivityEntries(
      supabase,
      connectionResult.data ?? [],
      personId,
    );

    const noteEntries = (noteResult.data ?? []).map((row) =>
      mapNoteToActivityEntry(mapNoteRow(row as Record<string, unknown>))
    );

    return [...provenanceEntries, ...connectionEntries, ...noteEntries].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  },
);

async function resolvePersonConnectionActivityEntries(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  rows: EntityLinkRow[],
  thisPersonId: string,
): Promise<PersonActivityEvent[]> {
  if (rows.length === 0) return [];

  const nameMap = await buildConnectionEntityNameMap(supabase, rows, "person", thisPersonId);

  return rows.map((row) => {
    const isOutgoing = row.source_type === "person" && row.source_id === thisPersonId;
    const otherType = isOutgoing ? row.target_type : row.source_type;
    const otherId = isOutgoing ? row.target_id : row.source_id;
    const resolved = resolveConnectionEntityFromMap(nameMap, otherType, otherId);
    const typeLabel = connectionEntityTypeLabel(otherType);
    const displayName = resolved?.name ?? UNRESOLVED_CONNECTION_LABEL;

    return {
      id: `connection-created-${row.id}`,
      at: row.created_at,
      kind: (row.created_by ? "user" : "system") as PersonActivityEvent["kind"],
      label: `Connected to ${typeLabel}`,
      detail: resolved?.href ? null : displayName,
      entityName: resolved?.name ?? null,
      entityHref: resolved?.href || null,
      field: "connection",
      source: "manual" as const,
      status: "applied" as const,
    };
  });
}

export const getPersonProfileFields = cache(
  async (personId: string): Promise<PersonProfileFieldsView | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: person, error } = await supabase
      .from("people")
      .select("id, title, relationship_type")
      .eq("id", personId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error || !person) return null;

    const { data: orgLinks } = await supabase
      .from("organization_people")
      .select("is_primary, organization:organizations(id, name)")
      .eq("person_id", personId);

    const org = getPrimaryOrg(orgLinks);

    const { data: provenanceRows } = await supabase
      .from("profile_field_provenance")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("entity_type", "person")
      .eq("entity_id", personId)
      .order("set_at", { ascending: false });

    const latestByField = new Map<string, ProfileFieldProvenanceView>();
    for (const row of provenanceRows ?? []) {
      const field = row.field as string;
      if (!latestByField.has(field)) {
        latestByField.set(field, mapProvenanceRow(row as Record<string, unknown>));
      }
    }

    return {
      personId,
      relationshipType: (person.relationship_type as RelationshipType | null) ?? null,
      title: (person.title as string | null) ?? null,
      primaryOrg: org,
      provenance: [...latestByField.values()],
    };
  },
);

function mapCachedHealth(row: Record<string, unknown>): RelationshipHealthResult {
  const band = (row.relationship_health_band as RelationshipHealthResult["band"] | null) ?? "insufficient";
  const archetype =
    (row.relationship_health_archetype as RelationshipHealthResult["archetype"] | null) ?? "neutral";
  const factors = Array.isArray(row.relationship_health_factors)
    ? (row.relationship_health_factors as RelationshipHealthResult["factors"])
    : [];

  return {
    score: (row.relationship_health_score as number | null) ?? null,
    band,
    archetype,
    factors,
    version: (row.relationship_health_version as number | null) ?? 1,
    label: ARCHETYPE_DISPLAY_LABEL[archetype],
  };
}

function isHealthCacheFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const updatedMs = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedMs)) return false;
  return Date.now() - updatedMs < HEALTH_FRESHNESS_MS;
}

export const getPersonRelationshipHealth = cache(
  async (personId: string): Promise<RelationshipHealthResult | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: person, error } = await supabase
      .from("people")
      .select(
        "id, relationship_health_score, relationship_health_band, relationship_health_archetype, relationship_health_factors, relationship_health_version, relationship_health_updated_at",
      )
      .eq("id", personId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !person) return null;

    const updatedAt = (person.relationship_health_updated_at as string | null) ?? null;
    const hasCachedBand = person.relationship_health_band != null;

    if (hasCachedBand && isHealthCacheFresh(updatedAt)) {
      return mapCachedHealth(person as Record<string, unknown>);
    }

    return recomputeRelationshipHealth(personId);
  },
);

