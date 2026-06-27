import "server-only";

import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { MemoryListQueryOptions } from "@/app/_features/relationships/queries";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  isWorkHealthStale,
  scheduleWorkHealthRecompute,
} from "@/app/_features/work/health/recompute";
import type {
  WorkActivityEvent,
  WorkDetailData,
  WorkDetailSummary,
  WorkHealthFactor,
  WorkProfileFieldsView,
  WorkProfileFieldProvenanceView,
  WorkServiceRef,
} from "./types";
import { mapWorkProvenanceToActivity } from "./utils/activity";
import { deriveWorkProgress } from "./utils/progress";
import { assembleWorkNarrativeSignals } from "@/app/_features/memory/narrative/assemble";
import { resolveRecordNarrative } from "@/app/_features/memory/narrative/recompute";

const DEFAULT_MEMORY_LIST_LIMIT = 100;

function daysSinceIso(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function mapProvenanceRow(row: Record<string, unknown>): WorkProfileFieldProvenanceView {
  const valueObj = row.value as { text?: string } | null;
  return {
    field: row.field as string,
    value: valueObj?.text ?? null,
    source: row.source as WorkProfileFieldProvenanceView["source"],
    ruleId: (row.rule_id as string | null) ?? null,
    confidence: (row.confidence as number | null) ?? null,
    because:
      typeof row.evidence === "object" && row.evidence && "because" in (row.evidence as object)
        ? String((row.evidence as { because?: string }).because)
        : null,
    status: row.status as WorkProfileFieldProvenanceView["status"],
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    setAt: row.set_at as string,
  };
}

export const getWorkActivity = cache(async (workId: string): Promise<WorkActivityEvent[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: provenanceRows } = await supabase
    .from("profile_field_provenance")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", "work")
    .eq("entity_id", workId)
    .order("set_at", { ascending: false });

  return (provenanceRows ?? [])
    .map((row) => mapProvenanceRow(row as Record<string, unknown>))
    .map(mapWorkProvenanceToActivity);
});

export const getWorkProfileFields = cache(async (workId: string): Promise<WorkProfileFieldsView | null> => {
  const summary = await getWorkDetailSummary(workId);
  if (!summary) return null;

  const { workspace, supabase } = await getWorkspaceContext();

  const { data: provenanceRows } = await supabase
    .from("profile_field_provenance")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", "work")
    .eq("entity_id", workId)
    .order("set_at", { ascending: false });

  const latestByField = new Map<string, WorkProfileFieldProvenanceView>();
  for (const row of provenanceRows ?? []) {
    const field = row.field as string;
    if (!latestByField.has(field)) {
      latestByField.set(field, mapProvenanceRow(row as Record<string, unknown>));
    }
  }

  return {
    workId,
    status: summary.status,
    workType: summary.workType,
    stage: summary.stage,
    description: summary.description,
    deadline: summary.deadline,
    startDate: summary.startDate,
    provenance: [...latestByField.values()],
  };
});

export interface MemoryWorkRow {
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
  service: { id: string; name: string } | null;
}

/**
 * List work/projects for the Memory directory — no clients-table join so
 * system-play rows (person-linked client_id) still appear.
 */
export const getMemoryWorkItems = cache(
  async (options: MemoryListQueryOptions = {}): Promise<MemoryWorkRow[]> => {
    const { limit = DEFAULT_MEMORY_LIST_LIMIT, offset = 0 } = options;
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, status, updated_at, service_id")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching memory work items:", error);
      throw error;
    }

    const serviceIds = [...new Set((data ?? []).map((row) => row.service_id).filter(Boolean))] as string[];
    const serviceById = new Map<string, { id: string; name: string }>();

    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from("workspace_services")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .in("id", serviceIds);

      for (const service of services ?? []) {
        serviceById.set(service.id, { id: service.id, name: service.name });
      }
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      updatedAt: new Date(row.updated_at),
      service: row.service_id ? (serviceById.get(row.service_id) ?? null) : null,
    }));
  },
);

async function resolveWorkOrg(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  workspaceId: string,
  clientId: string | null,
): Promise<{ id: string; name: string } | null> {
  if (!clientId) return null;

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("migrated_from_client_id", clientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (orgRow) {
    return { id: orgRow.id, name: orgRow.name };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .maybeSingle();

  if (clientRow) {
    return { id: clientRow.id, name: clientRow.name };
  }

  return null;
}

function parseHealthFactors(value: unknown): WorkHealthFactor[] | null {
  if (!Array.isArray(value)) return null;
  const factors: WorkHealthFactor[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const factor = item as Record<string, unknown>;
    if (typeof factor.factor !== "string" || typeof factor.reason !== "string") continue;
    factors.push({
      factor: factor.factor,
      impact: typeof factor.impact === "number" ? factor.impact : 0,
      reason: factor.reason,
    });
  }
  return factors.length > 0 ? factors : null;
}

function parseScopeItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
}

export const getWorkspaceServicesForWork = cache(async (): Promise<WorkServiceRef[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("workspace_services")
    .select("id, name, base_price_cents, typical_timeline, currency, is_active, display_order")
    .eq("workspace_id", workspace.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching workspace services for work:", error);
    return [];
  }

  return (data ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    basePriceCents: (service.base_price_cents as number | null) ?? null,
    typicalTimeline: (service.typical_timeline as string | null) ?? null,
    currency: (service.currency as string | null) ?? "USD",
  }));
});

export const getWorkDetailSummary = cache(async (workId: string): Promise<WorkDetailSummary | null> => {
  const { workspace, supabase, userId } = await getWorkspaceContext();

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, slug, status, description, work_type, stage, client_id, service_id, contract_value_cents, payment_type, payment_terms, currency, hourly_rate_cents, hours_estimate, retainer_mrr_cents, renewal_date, billing_cycle, billing_contact_id, po_number, estimated_timeline, discount_percent, discount_amount_cents, discount_reason, final_price_cents, scope_items, created_at, updated_at, start_date, deadline, stage_entered_at, health_score_cached, health_band, health_factors, health_updated_at, ai_summary, ai_worth_attention, ai_worth_attention_play, ai_summary_inputs_hash, ai_summary_model, ai_summary_generated_at",
    )
    .eq("id", workId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    console.error("Error fetching work detail summary:", error);
    return null;
  }

  if (!project) return null;

  const org = await resolveWorkOrg(
    supabase,
    workspace.id,
    (project.client_id as string | null) ?? null,
  );

  let service: WorkServiceRef | null = null;
  if (project.service_id) {
    const { data: serviceRow } = await supabase
      .from("workspace_services")
      .select("id, name, base_price_cents, typical_timeline, currency")
      .eq("workspace_id", workspace.id)
      .eq("id", project.service_id)
      .maybeSingle();

    if (serviceRow) {
      service = {
        id: serviceRow.id,
        name: serviceRow.name,
        basePriceCents: (serviceRow.base_price_cents as number | null) ?? null,
        typicalTimeline: (serviceRow.typical_timeline as string | null) ?? null,
        currency: (serviceRow.currency as string | null) ?? "USD",
      };
    }
  }

  const healthUpdatedAt = (project.health_updated_at as string | null) ?? null;
  if (isWorkHealthStale(healthUpdatedAt)) {
    scheduleWorkHealthRecompute(workId);
  }

  const status = project.status as string;
  const deadline = (project.deadline as string | null) ?? null;
  const healthBand = (project.health_band as string | null) ?? null;
  const updatedAt = (project.updated_at as string | null) ?? null;
  const { progress, overdue } = deriveWorkProgress({
    status,
    startDate: (project.start_date as string | null) ?? null,
    deadline,
    stageEnteredAt: (project.stage_entered_at as string | null) ?? null,
  });

  const narrativeSignals = assembleWorkNarrativeSignals({
    title: project.name as string,
    status,
    orgName: org?.name ?? null,
    progress,
    overdue,
    deadline,
    healthBand,
    lastActivityDaysAgo: daysSinceIso(updatedAt),
    description: (project.description as string | null) ?? null,
  });
  const aiNarrative = resolveRecordNarrative({
    table: "projects",
    recordId: project.id as string,
    kind: "work",
    userId,
    signals: narrativeSignals,
    cache: {
      ai_summary: (project.ai_summary as string | null) ?? null,
      ai_worth_attention: (project.ai_worth_attention as string | null) ?? null,
      ai_worth_attention_play: (project.ai_worth_attention_play as string | null) ?? null,
      ai_summary_inputs_hash: (project.ai_summary_inputs_hash as string | null) ?? null,
      ai_summary_model: (project.ai_summary_model as string | null) ?? null,
      ai_summary_generated_at: (project.ai_summary_generated_at as string | null) ?? null,
    },
  });

  return {
    id: project.id,
    name: project.name,
    slug: (project.slug as string | null) ?? null,
    status: project.status as string,
    description: (project.description as string | null) ?? null,
    workType: (project.work_type as WorkDetailSummary["workType"]) ?? null,
    stage: (project.stage as string | null) ?? null,
    org,
    clientId: (project.client_id as string | null) ?? null,
    people: [],
    service,
    serviceId: (project.service_id as string | null) ?? null,
    contractValueCents: (project.contract_value_cents as number | null) ?? null,
    paymentType: (project.payment_type as WorkDetailSummary["paymentType"]) ?? null,
    paymentTerms: (project.payment_terms as WorkDetailSummary["paymentTerms"]) ?? null,
    currency: (project.currency as string | null) ?? "USD",
    hourlyRateCents: (project.hourly_rate_cents as number | null) ?? null,
    hoursEstimate: project.hours_estimate == null ? null : Number(project.hours_estimate),
    retainerMrrCents: (project.retainer_mrr_cents as number | null) ?? null,
    renewalDate: (project.renewal_date as string | null) ?? null,
    billingCycle: (project.billing_cycle as WorkDetailSummary["billingCycle"]) ?? null,
    billingContactId: (project.billing_contact_id as string | null) ?? null,
    poNumber: (project.po_number as string | null) ?? null,
    estimatedTimeline: (project.estimated_timeline as string | null) ?? null,
    discountPercent: project.discount_percent == null ? null : Number(project.discount_percent),
    discountAmountCents: (project.discount_amount_cents as number | null) ?? null,
    discountReason: (project.discount_reason as string | null) ?? null,
    finalPriceCents: (project.final_price_cents as number | null) ?? null,
    scopeItems: parseScopeItems(project.scope_items),
    startDate: (project.start_date as string | null) ?? null,
    deadline: (project.deadline as string | null) ?? null,
    stageEnteredAt: (project.stage_entered_at as string | null) ?? null,
    healthScore: (project.health_score_cached as number | null) ?? null,
    healthBand: (project.health_band as string | null) ?? null,
    healthFactors: parseHealthFactors(project.health_factors),
    healthUpdatedAt,
    updatedAt,
    createdAt: (project.created_at as string | null) ?? null,
    aiNarrative,
  };
});

export const getWorkConnections = cache(async (workId: string): Promise<Connection[]> => {
  const summary = await getWorkDetailSummary(workId);
  if (!summary) return [];

  const { workspace, supabase } = await getWorkspaceContext();

  const { data: relations } = await supabase
    .from("entity_relations")
    .select("from_entity_type, from_entity_id, to_entity_type, to_entity_id")
    .eq("workspace_id", workspace.id)
    .or(
      `and(from_entity_type.in.(work,project),from_entity_id.eq.${workId}),and(to_entity_type.in.(work,project),to_entity_id.eq.${workId})`,
    );

  const connections: Connection[] = [];

  if (summary.org) {
    connections.push({
      id: summary.org.id,
      name: summary.org.name,
      type: "org",
    });
  }

  for (const relation of relations ?? []) {
    const isFromWork =
      (relation.from_entity_type === "work" || relation.from_entity_type === "project") &&
      relation.from_entity_id === workId;
    const targetType = isFromWork ? relation.to_entity_type : relation.from_entity_type;
    const targetId = isFromWork ? relation.to_entity_id : relation.from_entity_id;

    if (targetType === "person") {
      const { data: personRow } = await supabase
        .from("people")
        .select("id, name, title")
        .eq("id", targetId)
        .maybeSingle();
      if (personRow) {
        connections.push({
          id: personRow.id,
          name: personRow.name,
          type: "person",
          subtitle: (personRow.title as string | null) ?? undefined,
        });
      }
    }

    if (targetType === "organization") {
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("id, name, industry")
        .eq("id", targetId)
        .maybeSingle();
      if (orgRow) {
        connections.push({
          id: orgRow.id,
          name: orgRow.name,
          type: "org",
          subtitle: (orgRow.industry as string | null) ?? undefined,
        });
      }
    }
  }

  const unique: Connection[] = [];
  for (const connection of connections) {
    if (!unique.some((c) => c.id === connection.id && c.type === connection.type)) {
      unique.push(connection);
    }
  }

  return unique;
});

export const getWorkDetailData = cache(async (workId: string): Promise<WorkDetailData> => {
  const { getEntityLifecycleEvents } = await import("@/app/_features/memory/queries/lifecycle-events");

  const [summary, profileFields, connections, availableServices, activity, lifecycleEvents] =
    await Promise.all([
    getWorkDetailSummary(workId),
    getWorkProfileFields(workId),
    getWorkConnections(workId),
    getWorkspaceServicesForWork(),
    getWorkActivity(workId),
    getEntityLifecycleEvents("work", workId),
  ]);

  return {
    summary,
    profileFields,
    connections,
    availableServices,
    activity,
    notes: [],
    lifecycleEvents,
  };
});
