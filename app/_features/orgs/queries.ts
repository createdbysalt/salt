import "server-only";

import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { HEALTH_FRESHNESS_MS } from "@/app/_lib/health/core";
import { ORG_ARCHETYPE_DISPLAY_LABEL } from "@/app/_features/orgs/health/archetypes";
import { recomputeOrgHealth } from "@/app/_features/orgs/health/recompute";
import type { OrgHealthResult } from "@/app/_features/orgs/health/types";
import type { RelationshipStatus } from "@/app/_features/relationships/types";
import type { Connection, Invoice, LinkedFile, LinkedWork, PersonNote } from "@/app/_lib/demo/people-demo-data";
import type {
  OrgActivityEvent,
  OrgDetailMetrics,
  OrgDetailSummary,
  OrgNote,
  OrgProfileFieldProvenanceView,
  OrgProfileFieldsView,
} from "./types";
import { mapOrgProvenanceToActivity } from "./utils/activity";

function mapProvenanceRow(row: Record<string, unknown>): OrgProfileFieldProvenanceView {
  const valueObj = row.value as { text?: string } | null;
  return {
    field: row.field as string,
    value: valueObj?.text ?? null,
    source: row.source as OrgProfileFieldProvenanceView["source"],
    ruleId: (row.rule_id as string | null) ?? null,
    confidence: (row.confidence as number | null) ?? null,
    because:
      typeof row.evidence === "object" && row.evidence && "because" in (row.evidence as object)
        ? String((row.evidence as { because?: string }).because)
        : null,
    status: row.status as OrgProfileFieldProvenanceView["status"],
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    setAt: row.set_at as string,
  };
}

async function getOrgClientMetrics(input: {
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"];
  clientId: string | null;
  contactCount: number;
  updatedAt: string | null;
}): Promise<OrgDetailMetrics> {
  if (!input.clientId) {
    const health: OrgDetailMetrics["health"] =
      input.contactCount >= 2 ? "good" : input.contactCount === 1 ? "watch" : "risk";
    return {
      activeWork: 0,
      outstandingCents: 0,
      meetingWithinDays: null,
      mrrCents: null,
      retainerLabel: null,
      health,
    };
  }

  const now = new Date();
  const [projectsResult, invoicesResult, subscriptionsResult, nextMeetingResult] = await Promise.all([
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
      .select("amount_cents, description, interval, interval_count")
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

  let health: OrgDetailMetrics["health"] = "good";
  if (outstandingCents > 0) health = "watch";
  if (input.contactCount === 0) health = "risk";

  return {
    activeWork: projectsResult.count ?? 0,
    outstandingCents,
    meetingWithinDays,
    mrrCents: mrrCents > 0 ? mrrCents : null,
    retainerLabel,
    health,
  };
}

function mapInvoiceStatus(status: string): Invoice["status"] {
  switch (status) {
    case "paid":
      return "paid";
    case "overdue":
      return "overdue";
    case "draft":
      return "draft";
    default:
      return "due";
  }
}

export const getOrgDetailSummary = cache(async (orgId: string): Promise<OrgDetailSummary | null> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !org) return null;

  const { data: orgPeople } = await supabase
    .from("organization_people")
    .select("is_primary, person:people(id, name, title)")
    .eq("organization_id", orgId);

  const people = (orgPeople ?? [])
    .filter((row) => row.person)
    .map((row) => {
      const person = row.person as unknown as { id: string; name: string; title: string | null };
      return { id: person.id, name: person.name, title: person.title };
    });

  const primaryRow = orgPeople?.find((row) => row.is_primary && row.person);
  const primaryPerson = primaryRow?.person as unknown as { id: string; name: string } | undefined;

  const metrics = await getOrgClientMetrics({
    supabase,
    clientId: (org.migrated_from_client_id as string | null) ?? null,
    contactCount: people.length,
    updatedAt: (org.updated_at as string | null) ?? null,
  });

  return {
    id: org.id,
    name: org.name,
    slug: (org.slug as string | null) ?? null,
    website: (org.website as string | null) ?? null,
    industry: (org.industry as string | null) ?? null,
    relationshipStatus: org.relationship_status as RelationshipStatus,
    notes: (org.notes as string | null) ?? null,
    migratedFromClientId: (org.migrated_from_client_id as string | null) ?? null,
    primaryContact: primaryPerson ? { id: primaryPerson.id, name: primaryPerson.name } : null,
    people,
    addressLine1: (org.address_line_1 as string | null) ?? null,
    addressLine2: (org.address_line_2 as string | null) ?? null,
    city: (org.city as string | null) ?? null,
    state: (org.state as string | null) ?? null,
    postalCode: (org.postal_code as string | null) ?? null,
    country: (org.country as string | null) ?? null,
    taxId: (org.tax_id as string | null) ?? null,
    lastContactAt: (org.last_contact_at as string | null) ?? null,
    createdAt: (org.created_at as string | null) ?? null,
    metrics,
    updatedAt: (org.updated_at as string | null) ?? null,
  };
});

export const getOrgProfileFields = cache(async (orgId: string): Promise<OrgProfileFieldsView | null> => {
  const summary = await getOrgDetailSummary(orgId);
  if (!summary) return null;

  const { workspace, supabase } = await getWorkspaceContext();

  const { data: provenanceRows } = await supabase
    .from("profile_field_provenance")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", "organization")
    .eq("entity_id", orgId)
    .order("set_at", { ascending: false });

  const latestByField = new Map<string, OrgProfileFieldProvenanceView>();
  for (const row of provenanceRows ?? []) {
    const field = row.field as string;
    if (!latestByField.has(field)) {
      latestByField.set(field, mapProvenanceRow(row as Record<string, unknown>));
    }
  }

  return {
    orgId,
    website: summary.website,
    industry: summary.industry,
    relationshipStatus: summary.relationshipStatus,
    primaryContact: summary.primaryContact,
    provenance: [...latestByField.values()],
  };
});

export const getOrgActivity = cache(async (orgId: string): Promise<OrgActivityEvent[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: provenanceRows } = await supabase
    .from("profile_field_provenance")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", "organization")
    .eq("entity_id", orgId)
    .order("set_at", { ascending: false });

  return (provenanceRows ?? [])
    .map((row) => mapProvenanceRow(row as Record<string, unknown>))
    .map(mapOrgProvenanceToActivity);
});

export const getOrgNotes = cache(async (orgId: string): Promise<OrgNote[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: relations, error: relError } = await supabase
    .from("entity_relations")
    .select("from_entity_id")
    .eq("workspace_id", workspace.id)
    .eq("from_entity_type", "note")
    .eq("to_entity_type", "organization")
    .eq("to_entity_id", orgId)
    .eq("relation_type", "mentioned_in");

  if (relError) {
    console.error("Error fetching org note relations:", relError);
    return [];
  }

  const noteIds = (relations ?? []).map((row) => row.from_entity_id as string);
  if (noteIds.length === 0) return [];

  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, content, author_type, created_at, is_pinned")
    .eq("workspace_id", workspace.id)
    .in("id", noteIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching org notes:", error);
    return [];
  }

  return (notes ?? []).map((row) => ({
    id: row.id,
    author: row.author_type === "salt" ? "salt" : "you",
    at: row.created_at as string,
    body: row.content as string,
    pinned: Boolean(row.is_pinned),
  }));
});

export const getOrgConnections = cache(
  async (orgId: string): Promise<{ connections: Connection[]; work: LinkedWork[] }> => {
    const summary = await getOrgDetailSummary(orgId);
    if (!summary) return { connections: [], work: [] };

    const { workspace, supabase } = await getWorkspaceContext();

    const peopleConnections: Connection[] = summary.people.map((person) => ({
      id: person.id,
      name: person.name,
      type: "person" as const,
      subtitle: person.title ?? undefined,
    }));

    const { data: relations } = await supabase
      .from("entity_relations")
      .select("from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_type")
      .eq("workspace_id", workspace.id)
      .or(
        `and(from_entity_type.eq.organization,from_entity_id.eq.${orgId}),and(to_entity_type.eq.organization,to_entity_id.eq.${orgId})`,
      );

    const extraConnections: Connection[] = [];
    const work: LinkedWork[] = [];

    for (const relation of relations ?? []) {
      const isFromOrg = relation.from_entity_type === "organization" && relation.from_entity_id === orgId;
      const targetType = isFromOrg ? relation.to_entity_type : relation.from_entity_type;
      const targetId = isFromOrg ? relation.to_entity_id : relation.from_entity_id;

      if (targetType === "person") {
        const person = summary.people.find((p) => p.id === targetId);
        if (!person && !peopleConnections.some((c) => c.id === targetId)) {
          const { data: personRow } = await supabase
            .from("people")
            .select("id, name, title")
            .eq("id", targetId)
            .maybeSingle();
          if (personRow) {
            extraConnections.push({
              id: personRow.id,
              name: personRow.name,
              type: "person",
              subtitle: (personRow.title as string | null) ?? undefined,
            });
          }
        }
      }

      if (targetType === "organization" && targetId !== orgId) {
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("id, name, industry")
          .eq("id", targetId)
          .maybeSingle();
        if (orgRow) {
          extraConnections.push({
            id: orgRow.id,
            name: orgRow.name,
            type: "org",
            subtitle: (orgRow.industry as string | null) ?? undefined,
          });
        }
      }

      if (targetType === "work" || targetType === "project") {
        const { data: project } = await supabase
          .from("projects")
          .select("id, name, status")
          .eq("id", targetId)
          .maybeSingle();
        if (project) {
          work.push({
            id: project.id,
            title: project.name,
            status: project.status === "active" ? "Active" : "Wrapping",
            progress: project.status === "active" ? 50 : 100,
          });
          extraConnections.push({
            id: project.id,
            name: project.name,
            type: "work",
            subtitle: project.status ?? undefined,
          });
        }
      }
    }

    const connections = [...peopleConnections];
    for (const connection of extraConnections) {
      if (!connections.some((c) => c.id === connection.id && c.type === connection.type)) {
        connections.push(connection);
      }
    }

    return { connections, work };
  },
);

export const getOrgInvoices = cache(async (orgId: string): Promise<Invoice[]> => {
  const summary = await getOrgDetailSummary(orgId);
  if (!summary?.migratedFromClientId) return [];

  const { supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("portal_invoices")
    .select("id, invoice_number, amount_cents, status, due_date")
    .eq("client_id", summary.migratedFromClientId)
    .order("due_date", { ascending: false });

  if (error) {
    console.error("Error fetching org invoices:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    number: (row.invoice_number as string | null) ?? "—",
    amountCents: (row.amount_cents as number | null) ?? 0,
    status: mapInvoiceStatus(row.status as string),
    dueAt: (row.due_date as string | null) ?? new Date().toISOString(),
  }));
});

export const getOrgFiles = cache(async (orgId: string): Promise<LinkedFile[]> => {
  const summary = await getOrgDetailSummary(orgId);
  if (!summary?.migratedFromClientId) return [];

  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("project_files")
    .select("id, file_name, created_at, mime_type")
    .eq("workspace_id", workspace.id)
    .eq("client_id", summary.migratedFromClientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching org files:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.file_name as string,
    category: (row.mime_type as string | null)?.includes("pdf") ? "contract" : "deliverable",
    updatedAt: (row.created_at as string | null) ?? new Date().toISOString(),
  }));
});

function mapCachedOrgHealth(row: Record<string, unknown>): OrgHealthResult {
  const band = (row.relationship_health_band as OrgHealthResult["band"] | null) ?? "insufficient";
  const archetype =
    (row.relationship_health_archetype as OrgHealthResult["archetype"] | null) ?? "neutral";
  const factors = Array.isArray(row.relationship_health_factors)
    ? (row.relationship_health_factors as OrgHealthResult["factors"])
    : [];

  return {
    score: (row.relationship_health_score as number | null) ?? null,
    band,
    archetype,
    factors,
    version: (row.relationship_health_version as number | null) ?? 1,
    label: ORG_ARCHETYPE_DISPLAY_LABEL[archetype],
  };
}

function isHealthCacheFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const updatedMs = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedMs)) return false;
  return Date.now() - updatedMs < HEALTH_FRESHNESS_MS;
}

export const getOrgRelationshipHealth = cache(
  async (orgId: string): Promise<OrgHealthResult | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: org, error } = await supabase
      .from("organizations")
      .select(
        "id, relationship_health_score, relationship_health_band, relationship_health_archetype, relationship_health_factors, relationship_health_version, relationship_health_updated_at",
      )
      .eq("id", orgId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !org) return null;

    const updatedAt = (org.relationship_health_updated_at as string | null) ?? null;
    const hasCachedBand = org.relationship_health_band != null;

    if (hasCachedBand && isHealthCacheFresh(updatedAt)) {
      return mapCachedOrgHealth(org as Record<string, unknown>);
    }

    return recomputeOrgHealth(orgId);
  },
);

export const getOrgDetailData = cache(async (orgId: string) => {
  const [summary, profileFields, activity, notes, connectionData, invoices, files, health] =
    await Promise.all([
      getOrgDetailSummary(orgId),
      getOrgProfileFields(orgId),
      getOrgActivity(orgId),
      getOrgNotes(orgId),
      getOrgConnections(orgId),
      getOrgInvoices(orgId),
      getOrgFiles(orgId),
      getOrgRelationshipHealth(orgId),
    ]);

  return {
    summary,
    profileFields,
    activity,
    notes,
    connections: connectionData.connections,
    work: connectionData.work,
    invoices,
    files,
    health,
  };
});
