import "server-only";

/**
 * Record tag-fit producer (Track C of the zero-pills sourcing plan) — the
 * person tag-fit pattern generalized to orgs, work, billing, and resources.
 *
 * Assigns EXISTING workspace tags when a deterministic fit clears the bar,
 * then dispatches `<type>_tag_fit_detected` so the evidence chain records
 * the fit. Coining new tags stays gated by tag_auto_create_threshold /
 * tag_max_ai_created — a fit against a tag the workspace does not have is a
 * no-op here. The tags field has no dbColumn, so this producer is its only
 * write path.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { memoryGetFacts } from "@/app/_lib/memory-tools";
import type { LearningEntityType } from "@/app/_lib/memory-tools";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import { executeRecordAction } from "@/app/_features/memory/records/executor";

export type TagFitEntityType = "org" | "work" | "billing" | "resource";

interface TagFitContext {
  facts: Record<string, unknown>;
  signals: Record<string, boolean | number | string>;
}

interface TagFitRule {
  /** workspace_tags.slug the rule assigns when it clears. */
  slug: string;
  when: (ctx: TagFitContext) => boolean;
  because: string;
}

const LEARNING_ENTITY_TYPE: Record<TagFitEntityType, LearningEntityType> = {
  org: "organization",
  work: "work",
  billing: "billing",
  resource: "resource",
};

// Literal signal ids (the registry parity test scans source textually —
// a template-built key would read as "no producer").
const TAG_FIT_SIGNAL: Record<TagFitEntityType, string> = {
  org: "org_tag_fit_detected",
  work: "work_tag_fit_detected",
  billing: "billing_tag_fit_detected",
  resource: "resource_tag_fit_detected",
};

/**
 * Deterministic fits, one conservative set per record type. Every rule
 * needs DB-computed signals or facts (never a single thin hint), and the
 * tag must already exist in the workspace.
 */
const TAG_FIT_RULES: Record<TagFitEntityType, readonly TagFitRule[]> = {
  org: [
    {
      slug: "vip",
      when: (ctx) =>
        ctx.signals.org_has_payment_received === true &&
        ctx.signals.org_has_people === true,
      because: "Paying client with known contacts",
    },
  ],
  work: [
    {
      slug: "billable",
      when: (ctx) => typeof ctx.signals.work_invoice_created === "string",
      because: "Work with an invoice linked",
    },
  ],
  billing: [
    {
      slug: "overdue",
      when: (ctx) => ctx.signals.billing_due_date_passed === true,
      because: "Past due and still unpaid",
    },
  ],
  resource: [
    {
      slug: "contract",
      when: (ctx) => ctx.facts.category === "contract",
      because: "Categorized as a contract",
    },
    {
      slug: "signed",
      when: (ctx) => ctx.facts.lifecycle_status === "signed",
      because: "Fully executed document",
    },
  ],
};

export async function produceRecordTagFits(input: {
  workspaceId: string;
  entityType: TagFitEntityType;
  entityId: string;
  /** Producer label for evidence, e.g. the connector sourceType. */
  source: string;
}): Promise<{ assigned: string[] }> {
  const { workspaceId, entityType, entityId } = input;

  const { facts, signals } = await memoryGetFacts({
    workspaceId,
    entityType: LEARNING_ENTITY_TYPE[entityType],
    entityId,
  });

  const admin = createAdminClient();
  const { data: tagRows } = await admin
    .from("workspace_tags")
    .select("id, slug, label, scope")
    .eq("workspace_id", workspaceId)
    .eq("is_archived", false);

  // Mirror tag-service listTags: billing and resource only take
  // scope-specific tags; the other scopes also take "all".
  const assignableBySlug = new Map(
    (tagRows ?? [])
      .filter((tag) =>
        entityType === "billing" || entityType === "resource"
          ? tag.scope === entityType
          : tag.scope === entityType || tag.scope === "all",
      )
      .map((tag) => [tag.slug, tag]),
  );

  const { data: assignmentRows } = await admin
    .from("entity_tag_assignments")
    .select("tag_id")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  const assignedTagIds = new Set(
    (assignmentRows ?? []).map((row) => row.tag_id),
  );

  const factValues: Record<string, unknown> = {};
  for (const [field, fact] of Object.entries(facts)) {
    factValues[field] = fact.value;
  }

  const assigned: string[] = [];
  const signalKey = TAG_FIT_SIGNAL[entityType];

  for (const rule of TAG_FIT_RULES[entityType]) {
    const tag = assignableBySlug.get(rule.slug);
    if (!tag || assignedTagIds.has(tag.id)) continue;
    if (!rule.when({ facts: factValues, signals })) continue;

    const result = await executeRecordAction(workspaceId, "system:assign-tag", {
      entity_type: entityType,
      entity_id: entityId,
      tag_label: tag.label,
      because: rule.because,
    });
    if (!result.success) continue;

    await runCareForSignal({
      workspaceId,
      signalKey,
      entityType,
      entityId,
      evidence: {
        signalValues: { [signalKey]: tag.label },
        producer: input.source,
      },
    });
    assigned.push(tag.label);
  }

  return { assigned };
}
