import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import type {
  PersonProfileFieldsView,
  ProfileFieldProvenanceView,
} from "@/app/_features/plays/playbooks/profile/types";
import {
  mapProvenanceToActivity,
  type PersonActivityEvent,
} from "@/app/_features/people/utils/activity";
import type { RelationshipHealthResult } from "@/app/_features/people/health/types";
import { recomputeRelationshipHealth } from "@/app/_features/people/health/recompute";
import { ARCHETYPE_DISPLAY_LABEL } from "@/app/_features/people/health/archetypes";
import { HEALTH_FRESHNESS_MS } from "@/app/_features/people/health/types";
export { relationshipDisplayLabel } from "@/app/_features/people/utils/relationship-display";
export type { RelationshipHealthResult };

export interface PersonDetailSummary {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  relationshipType: RelationshipType | null;
  relationshipStatus: string | null;
  primaryOrg: { id: string; name: string } | null;
  migratedFromClientId: string | null;
  metrics: {
    activeWork: number;
    outstandingCents: number;
    meetingWithinDays: number | null;
    mrrCents: number | null;
    retainerLabel: string | null;
  };
  updatedAt: string | null;
}

async function getPersonWorkMetrics(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  clientId: string | null;
}): Promise<PersonDetailSummary["metrics"]> {
  if (!input.clientId) {
    return {
      activeWork: 0,
      outstandingCents: 0,
      meetingWithinDays: null,
      mrrCents: null,
      retainerLabel: null,
    };
  }

  const now = new Date();
  const [
    projectsResult,
    invoicesResult,
    subscriptionsResult,
    nextMeetingResult,
  ] = await Promise.all([
    input.supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("client_id", input.clientId)
      .in("status", ["signed", "active"]),
    input.supabase
      .from("portal_invoices")
      .select("amount_cents")
      .eq("client_id", input.clientId)
      .in("status", ["sent", "viewed", "overdue"]),
    input.supabase
      .from("portal_client_subscriptions")
      .select("amount_cents, description, interval, interval_count, current_period_end")
      .eq("client_id", input.clientId)
      .in("status", ["active", "trialing"]),
    input.supabase
      .from("client_meetings")
      .select("start_time")
      .eq("client_id", input.clientId)
      .eq("status", "scheduled")
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const outstandingCents = (invoicesResult.data ?? []).reduce(
    (sum, invoice) => sum + ((invoice.amount_cents as number | null) ?? 0),
    0,
  );
  const activeSubscriptions = subscriptionsResult.data ?? [];
  const mrrCents = activeSubscriptions.reduce((sum, subscription) => {
    const amount = (subscription.amount_cents as number | null) ?? 0;
    const interval = subscription.interval as string | null;
    const intervalCount = (subscription.interval_count as number | null) ?? 1;
    if (interval === "year") return sum + Math.round(amount / 12 / intervalCount);
    if (interval === "month") return sum + Math.round(amount / intervalCount);
    return sum + amount;
  }, 0);
  const firstSubscription = activeSubscriptions[0];
  const retainerLabel =
    (firstSubscription?.description as string | null) ??
    (activeSubscriptions.length > 0 ? "Active retainer" : null);
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
        "id, name, email, title, relationship_type, relationship_status, migrated_from_client_id, updated_at",
      )
      .eq("id", personId)
      .eq("studio_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !person) return null;

    const { data: orgLinks } = await supabase
      .from("organization_people")
      .select("is_primary, organization:organizations(id, name)")
      .eq("person_id", personId);
    const metrics = await getPersonWorkMetrics({
      supabase,
      clientId: (person.migrated_from_client_id as string | null) ?? null,
    });

    return {
      id: person.id,
      name: person.name,
      email: (person.email as string | null) ?? null,
      title: (person.title as string | null) ?? null,
      relationshipType: (person.relationship_type as RelationshipType | null) ?? null,
      relationshipStatus: (person.relationship_status as string | null) ?? null,
      primaryOrg: getPrimaryOrg(orgLinks),
      migratedFromClientId: (person.migrated_from_client_id as string | null) ?? null,
      metrics,
      updatedAt: (person.updated_at as string | null) ?? null,
    };
  },
);

export const getPersonActivity = cache(
  async (personId: string): Promise<PersonActivityEvent[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: provenanceRows } = await supabase
      .from("profile_field_provenance")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("entity_type", "person")
      .eq("entity_id", personId)
      .order("set_at", { ascending: false });

    return (provenanceRows ?? [])
      .map((row) => mapProvenanceRow(row as Record<string, unknown>))
      .map(mapProvenanceToActivity);
  },
);

export const getPersonProfileFields = cache(
  async (personId: string): Promise<PersonProfileFieldsView | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: person, error } = await supabase
      .from("people")
      .select("id, title, relationship_type")
      .eq("id", personId)
      .eq("studio_id", workspace.id)
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
      .eq("studio_id", workspace.id)
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

