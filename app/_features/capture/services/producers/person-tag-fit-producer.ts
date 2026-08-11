import "server-only";

/**
 * Tag-fit producer (registry-wiring Phase 4 of
 * .cursor/plans/2026-08-10-registry-wiring-record-sourcing.md)
 *
 * Assigns EXISTING workspace tags to a person when a deterministic fit rule
 * clears the bar, then dispatches `person_tag_fit_detected` so the evidence
 * chain records the fit. Coining new tags stays gated by
 * tag_auto_create_threshold / tag_max_ai_created — a fit against a tag the
 * workspace does not have is a no-op here.
 *
 * The assignment itself goes through system:assign-tag (admin path, playbook
 * execution log); the tags field has no dbColumn, so the records capability
 * cannot write it — this producer is its write path.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { memoryGetFacts } from "@/app/_lib/memory-tools";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import { executeSystemPlay } from "../system-plays/executor";

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

/**
 * Deterministic fits. Conservative on purpose: every rule needs multiple
 * corroborating signals, and the tag must already exist in the workspace.
 */
export const PERSON_TAG_FIT_RULES: readonly TagFitRule[] = [
  {
    slug: "vip",
    when: (ctx) =>
      ctx.signals.has_payment_received === true &&
      ctx.signals.has_calendar_meeting === true,
    because: "Paying client with an active meeting cadence",
  },
];

export async function producePersonTagFits(input: {
  workspaceId: string;
  personId: string;
  /** Producer label for evidence, e.g. the connector sourceType. */
  source: string;
}): Promise<{ assigned: string[] }> {
  const { workspaceId, personId } = input;

  const { facts, signals } = await memoryGetFacts({
    workspaceId,
    entityType: "person",
    entityId: personId,
  });

  const admin = createAdminClient();
  const { data: tagRows } = await admin
    .from("workspace_tags")
    .select("id, slug, label, scope")
    .eq("workspace_id", workspaceId)
    .eq("is_archived", false);

  const assignableBySlug = new Map(
    (tagRows ?? [])
      .filter((tag) => tag.scope === "person" || tag.scope === "all")
      .map((tag) => [tag.slug, tag]),
  );

  const { data: assignmentRows } = await admin
    .from("entity_tag_assignments")
    .select("tag_id")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "person")
    .eq("entity_id", personId);
  const assignedTagIds = new Set(
    (assignmentRows ?? []).map((row) => row.tag_id),
  );

  const factValues: Record<string, unknown> = {};
  for (const [field, fact] of Object.entries(facts)) {
    factValues[field] = fact.value;
  }

  const assigned: string[] = [];

  for (const rule of PERSON_TAG_FIT_RULES) {
    const tag = assignableBySlug.get(rule.slug);
    if (!tag || assignedTagIds.has(tag.id)) continue;
    if (!rule.when({ facts: factValues, signals })) continue;

    const result = await executeSystemPlay(workspaceId, "system:assign-tag", {
      entity_type: "person",
      entity_id: personId,
      tag_label: tag.label,
      because: rule.because,
    });
    if (!result.success) continue;

    await runCareForSignal({
      workspaceId,
      signalKey: "person_tag_fit_detected",
      entityType: "person",
      entityId: personId,
      evidence: {
        signalValues: { person_tag_fit_detected: tag.label },
        producer: input.source,
      },
    });
    assigned.push(tag.label);
  }

  return { assigned };
}
