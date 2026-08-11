import "server-only";

import { cache } from "react";
import { workspaceSpend } from "@/app/_lib/ai/gpt";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { HEALTH_FRESHNESS_MS } from "@/app/_lib/health/core";
import { ORG_ARCHETYPE_DISPLAY_LABEL } from "@/app/_features/orgs/health/archetypes";
import { recomputeOrgHealth } from "@/app/_features/orgs/health/recompute";
import type { OrgHealthResult } from "@/app/_features/orgs/health/types";
import type { RelationshipStatus } from "@/app/_features/relationships/types";
import type { Connection, Invoice, LinkedFile, LinkedWork } from "@/app/_lib/demo/people-demo-data";
import type {
  OrgActivityEvent,
  OrgDetailMetrics,
  OrgDetailSummary,
  OrgProfileFieldProvenanceView,
  OrgProfileFieldsView,
} from "./types";
import { mapOrgProvenanceToActivity } from "./utils/activity";
import { mapNoteToActivityEntry } from "@/app/_features/work/utils/activity";
import { mapNoteRow } from "@/app/_features/memory/types/taxonomies";
import {
  buildConnectionEntityNameMap,
  connectionEntityTypeLabel,
  resolveConnectionEntityFromMap,
  UNRESOLVED_CONNECTION_LABEL,
  type EntityLinkRow,
} from "@/app/_features/memory/utils/resolve-connection-entities";
import { assembleOrgNarrativeSignals } from "@/app/_features/memory/narrative/assemble";
import { resolveRecordNarrative } from "@/app/_features/memory/narrative/recompute";

function daysSinceIso(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

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
  orgId: string;
  contactCount: number;
  updatedAt: string | null;
}): Promise<OrgDetailMetrics> {
  const now = new Date();
  const [projectsResult, billingResult, retainersResult, nextMeetingResult] =
    await Promise.all([
      input.supabase
        .from("work")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", input.orgId)
        .in("status", ["signed", "active"]),
      input.supabase
        .from("billing_records")
        .select("amount_cents, amount_paid_cents")
        .eq("organization_id", input.orgId)
        .eq("direction", "receivable")
        .in("status", ["due", "overdue", "partial"]),
      input.supabase
        .from("work")
        .select("name, retainer_mrr_cents")
        .eq("organization_id", input.orgId)
        .eq("work_type", "retainer")
        .in("status", ["signed", "active"]),
      input.supabase
        .from("meetings")
        .select("start_time")
        .eq("organization_id", input.orgId)
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
  const { workspace, supabase, userId } = await getWorkspaceContext();

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
    orgId: org.id as string,
    contactCount: people.length,
    updatedAt: (org.updated_at as string | null) ?? null,
  });

  const narrativeSignals = assembleOrgNarrativeSignals({
    name: org.name as string,
    relationshipStatus: (org.relationship_status as string | null) ?? null,
    industry: (org.industry as string | null) ?? null,
    contactCount: people.length,
    activeWork: metrics.activeWork,
    mrrCents: metrics.mrrCents,
    outstandingCents: metrics.outstandingCents,
    healthBand: metrics.health,
    lastContactDaysAgo: daysSinceIso((org.last_contact_at as string | null) ?? null),
    notes: (org.notes as string | null) ?? null,
  });
  const aiNarrative = resolveRecordNarrative({
    table: "organizations",
    recordId: org.id as string,
    kind: "org",
    spend: workspaceSpend(workspace.id, userId),
    signals: narrativeSignals,
    cache: {
      ai_summary: (org.ai_summary as string | null) ?? null,
      ai_worth_attention: (org.ai_worth_attention as string | null) ?? null,
      ai_worth_attention_play: (org.ai_worth_attention_play as string | null) ?? null,
      ai_summary_inputs_hash: (org.ai_summary_inputs_hash as string | null) ?? null,
      ai_summary_model: (org.ai_summary_model as string | null) ?? null,
      ai_summary_generated_at: (org.ai_summary_generated_at as string | null) ?? null,
    },
  });

  return {
    id: org.id,
    name: org.name,
    slug: (org.slug as string | null) ?? null,
    website: (org.website as string | null) ?? null,
    industry: (org.industry as string | null) ?? null,
    industryParent: (org.industry_parent as string | null) ?? null,
    industryChild: (org.industry_child as string | null) ?? null,
    relationshipStatus: org.relationship_status as RelationshipStatus,
    notes: (org.notes as string | null) ?? null,
    primaryContact: primaryPerson ? { id: primaryPerson.id, name: primaryPerson.name } : null,
    people,
    addressLine1: (org.address_line_1 as string | null) ?? null,
    addressLine2: (org.address_line_2 as string | null) ?? null,
    city: (org.city as string | null) ?? null,
    state: (org.state as string | null) ?? null,
    postalCode: (org.postal_code as string | null) ?? null,
    country: (org.country as string | null) ?? null,
    taxId: (org.tax_id as string | null) ?? null,
    billingEmail: (org.billing_email as string | null) ?? null,
    lastContactAt: (org.last_contact_at as string | null) ?? null,
    createdAt: (org.created_at as string | null) ?? null,
    recordStatus: (org.record_status as "active" | "inactive" | null) ?? "active",
    metrics,
    updatedAt: (org.updated_at as string | null) ?? null,
    aiNarrative,
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
    industryParent: summary.industryParent,
    industryChild: summary.industryChild,
    relationshipStatus: summary.relationshipStatus,
    primaryContact: summary.primaryContact,
    provenance: [...latestByField.values()],
  };
});

export const getOrgActivity = cache(async (orgId: string): Promise<OrgActivityEvent[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const [provenanceResult, connectionResult, noteResult] = await Promise.all([
    supabase
      .from("profile_field_provenance")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("entity_type", "organization")
      .eq("entity_id", orgId)
      .order("set_at", { ascending: false }),
    supabase
      .from("entity_links")
      .select("id, source_type, source_id, target_type, target_id, relation_type, created_at, created_by")
      .eq("workspace_id", workspace.id)
      .or(`and(source_type.eq.org,source_id.eq.${orgId}),and(target_type.eq.org,target_id.eq.${orgId})`)
      .order("created_at", { ascending: false }),
    supabase
      .from("notes")
      .select("id, title, content, note_kind, source, source_ref, confidence, status, author_type, is_pinned, tags, created_at")
      .eq("workspace_id", workspace.id)
      .eq("entity_type", "organization")
      .eq("entity_id", orgId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const provenanceEntries = (provenanceResult.data ?? [])
    .map((row) => mapProvenanceRow(row as Record<string, unknown>))
    .map(mapOrgProvenanceToActivity);

  const connectionEntries = await resolveOrgConnectionActivityEntries(
    supabase,
    connectionResult.data ?? [],
    orgId,
  );

  const noteEntries = (noteResult.data ?? []).map((row) =>
    mapNoteToActivityEntry(mapNoteRow(row as Record<string, unknown>))
  );

  return [...provenanceEntries, ...connectionEntries, ...noteEntries].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
});

async function resolveOrgConnectionActivityEntries(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  rows: EntityLinkRow[],
  thisOrgId: string,
): Promise<OrgActivityEvent[]> {
  if (rows.length === 0) return [];

  const nameMap = await buildConnectionEntityNameMap(
    supabase,
    rows,
    "org",
    thisOrgId,
  );

  return rows.map((row) => {
    const isOutgoing = row.source_type === "org" && row.source_id === thisOrgId;
    const otherType = isOutgoing ? row.target_type : row.source_type;
    const otherId = isOutgoing ? row.target_id : row.source_id;
    const resolved = resolveConnectionEntityFromMap(nameMap, otherType, otherId);
    const typeLabel = connectionEntityTypeLabel(otherType);
    const displayName = resolved?.name ?? UNRESOLVED_CONNECTION_LABEL;

    return {
      id: `connection-created-${row.id}`,
      at: row.created_at,
      kind: (row.created_by ? "user" : "system") as OrgActivityEvent["kind"],
      label: `Connected to ${typeLabel}`,
      detail: resolved?.href ? null : displayName,
      entityName: resolved?.name ?? null,
      entityHref: resolved?.href || null,
      field: "connection" as OrgActivityEvent["field"],
      source: "manual" as const,
      status: "applied" as const,
    };
  });
}

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
      .from("entity_links")
      .select("source_type, source_id, target_type, target_id, relation_type")
      .eq("workspace_id", workspace.id)
      .or(
        `and(source_type.eq.org,source_id.eq.${orgId}),and(target_type.eq.org,target_id.eq.${orgId})`,
      );

    const extraConnections: Connection[] = [];
    const work: LinkedWork[] = [];

    for (const relation of relations ?? []) {
      const isFromOrg = relation.source_type === "org" && relation.source_id === orgId;
      const targetType = isFromOrg ? relation.target_type : relation.source_type;
      const targetId = isFromOrg ? relation.target_id : relation.source_id;

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

      if (targetType === "org" && targetId !== orgId) {
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

      if (targetType === "work") {
        const { data: project } = await supabase
          .from("work")
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
  const { supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("billing_records")
    .select("id, number, amount_cents, status, due_at")
    .eq("organization_id", orgId)
    .eq("direction", "receivable")
    .order("due_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Error fetching org invoices:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    number: (row.number as string | null) ?? "—",
    amountCents: (row.amount_cents as number | null) ?? 0,
    status: mapInvoiceStatus(row.status as string),
    dueAt: (row.due_at as string | null) ?? new Date().toISOString(),
  }));
});

export const getOrgFiles = cache(async (orgId: string): Promise<LinkedFile[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("resources")
    .select("id, file_name, created_at, mime_type")
    .eq("workspace_id", workspace.id)
    .eq("organization_id", orgId)
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
  const { getOrgLifecycleEvents } = await import("@/app/_features/memory/queries/lifecycle-events");
  const { getEntitySourceHistory } = await import("@/app/_features/memory/queries/source-history");
  const { getOrgBillingAccount } = await import("@/app/_features/billing/queries/billing-accounts");
  const { getEntityNotes } = await import("@/app/_features/memory/queries/entity-notes");
  const { getEntityConnections } = await import("@/app/_features/connections/queries");
  const { getWorkspaceContext } = await import("@/app/_lib/utils/user-dashboard");

  const { workspace } = await getWorkspaceContext();

  const [summary, profileFields, activity, notes, connectionData, invoices, files, health, lifecycleEvents, sourceHistory, billingMetrics, unifiedConnections] =
    await Promise.all([
      getOrgDetailSummary(orgId),
      getOrgProfileFields(orgId),
      getOrgActivity(orgId),
      getEntityNotes("organization", orgId),
      getOrgConnections(orgId),
      getOrgInvoices(orgId),
      getOrgFiles(orgId),
      getOrgRelationshipHealth(orgId),
      getOrgLifecycleEvents(orgId),
      getEntitySourceHistory("org", orgId),
      getOrgBillingAccount(orgId),
      getEntityConnections(workspace.id, "org", orgId),
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
    lifecycleEvents,
    sourceHistory,
    billingMetrics,
    unifiedConnections,
  };
});
