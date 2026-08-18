"use server";

/**
 * Kept-Out corrections (Connector Rules & Learning, P4).
 *
 * Category-dispatched, not sender-only: the capture's feedbackEntity comes
 * from its category adapter (the Phase 2 extraction — built once, consumed
 * here), so an email sender, a Slack channel, and a calendar organizer all
 * correct through the same path.
 *
 * - alwaysAllowEntity: provider-scoped allow rule + admit the capture at
 *   full prominence + positive feedback.
 * - removeBlockRuleForCapture: find the deny rule that kept this capture
 *   out (via checkRules against its entity) and remove it; the capture
 *   goes back to Watching — not straight in.
 * - escalateSenderToWatching ("Add to People"): email escalation that
 *   boosts the sender toward a Memory contact proposal — not straight
 *   into People.
 */

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createClient } from "@/app/_lib/supabase/server";
import { getCategoryForConnector } from "@/app/_lib/composio/enrichment/registry";
import { extractFeedbackEntityForEnvelope } from "../adapters/feedback-entity";
import { ruleMatchCandidatesForEnvelope } from "../adapters/rule-match-candidates";
import { addRule, checkRules, removeRule } from "../services/rules-manager";
import { CATEGORY_TO_AREA } from "../adapters/rule-entities";
import { recordEntityObservation } from "../services/entity-profiles";
import { recordFeedback } from "../services/training-feedback";
import { recordDecisionOutcomeForCapture } from "../services/intelligence/record-capture-outcome";
import type { CaptureEnvelope } from "../adapters/types";
import type { FeedbackEntity } from "../adapters/types";
import type {
  CaptureEventType,
  CaptureSourceType,
} from "@/app/_features/capture/types";

export interface CorrectionResult {
  success: boolean;
  error?: string;
}

interface CaptureRowForCorrection {
  id: string;
  source_type: string;
  capture_type: string;
  title: string | null;
  source_external_id: string | null;
  extracted_data: unknown;
  raw_payload: unknown;
}

async function loadCaptureForCorrection(
  captureId: string,
  workspaceId: string,
): Promise<CaptureRowForCorrection | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("capture_events")
    .select(
      "id, source_type, capture_type, title, source_external_id, extracted_data, raw_payload",
    )
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data as CaptureRowForCorrection | null) ?? null;
}

/**
 * Rebuild just enough of an envelope for the category adapter's entity
 * extraction. capture_events stores no participants column — extraction
 * keys off extracted_data first, so participant fallbacks simply miss.
 */
function envelopeForCaptureRow(row: CaptureRowForCorrection): CaptureEnvelope {
  return {
    sourceType: row.source_type as CaptureSourceType,
    captureType: row.capture_type as CaptureEventType,
    externalId: row.source_external_id ?? row.id,
    title: row.title,
    occurredAt: null,
    participants: [],
    threadId: null,
    extracted:
      row.extracted_data && typeof row.extracted_data === "object"
        ? (row.extracted_data as Record<string, unknown>)
        : {},
    raw:
      row.raw_payload && typeof row.raw_payload === "object"
        ? (row.raw_payload as Record<string, unknown>)
        : {},
    noise: null,
  };
}

/**
 * P6 implicit writer: a user correction is the strongest learning signal.
 * Records ±10 reputation on the capture's entity — category-dispatched, so
 * email senders accrue on capture_sender_profiles and everything else on
 * connector_entity_profiles. Never throws: learning must not fail the
 * correction itself.
 */
async function recordCorrectionObservation(
  workspaceId: string,
  provider: string,
  entity: FeedbackEntity,
  delta: number,
): Promise<void> {
  try {
    const category = await getCategoryForConnector(provider);
    if (!category) return;
    await recordEntityObservation(workspaceId, {
      provider,
      category,
      entity,
      delta,
    });
  } catch (error) {
    console.error("[corrections] entity observation failed:", error);
  }
}

async function setGateAction(
  captureId: string,
  workspaceId: string,
  gateAction: "signal" | "candidate",
): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("capture_events")
    .update({ gate_action: gateAction })
    .eq("id", captureId)
    .eq("workspace_id", workspaceId);
  return error ? error.message : null;
}

/**
 * Always let this entity in: provider-scoped allow rule + admit this
 * capture + positive feedback. The email case is the plan's
 * "alwaysAllowSender"; the same path serves every capture category.
 */
export async function alwaysAllowEntity(
  captureId: string,
): Promise<CorrectionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const capture = await loadCaptureForCorrection(captureId, workspace.id);
  if (!capture) {
    return { success: false, error: "Capture not found" };
  }

  const entity = await extractFeedbackEntityForEnvelope(
    envelopeForCaptureRow(capture),
  );
  if (!entity) {
    return {
      success: false,
      error: "Salt can't tell who this came from, so there's nothing to allow.",
    };
  }

  const ruleResult = await addRule({
    workspaceId: workspace.id,
    provider: capture.source_type,
    ruleType: "allow",
    entityType: entity.type,
    entityKey: entity.key,
    reason: "Always let in (Kept Out correction)",
    createdBy: context.userId ?? undefined,
  });
  // A duplicate allow rule is not a failure — the correction is idempotent.
  if (!ruleResult.success && ruleResult.error !== "Rule already exists") {
    return { success: false, error: ruleResult.error };
  }

  const gateError = await setGateAction(captureId, workspace.id, "signal");
  if (gateError) {
    return { success: false, error: gateError };
  }

  try {
    await recordFeedback({
      workspaceId: workspace.id,
      captureEventId: captureId,
      feedbackType: "more_like_this",
      senderEmail: entity.type === "sender_email" ? entity.key : undefined,
    });
  } catch (error) {
    console.error("[corrections] feedback recording failed:", error);
  }

  await recordDecisionOutcomeForCapture(
    captureId,
    "approved",
    context.userId ?? undefined,
  );
  await recordCorrectionObservation(
    workspace.id,
    capture.source_type,
    entity,
    10,
  );

  revalidatePath("/sources");
  revalidatePath("/memory");
  return { success: true };
}

/**
 * Remove the keep-out rule that dropped this capture. The rule is matched
 * through checkRules against the capture's entity — the same evaluation
 * the gate ran — so derived-domain and provider-scoped denies resolve to
 * the exact row that fired. The capture returns to Watching.
 */
export async function removeBlockRuleForCapture(
  captureId: string,
): Promise<CorrectionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const capture = await loadCaptureForCorrection(captureId, workspace.id);
  if (!capture) {
    return { success: false, error: "Capture not found" };
  }

  const captureEnvelope = envelopeForCaptureRow(capture);
  const entity = await extractFeedbackEntityForEnvelope(captureEnvelope);
  if (!entity) {
    return {
      success: false,
      error: "Salt can't tell who this came from, so no rule can be matched.",
    };
  }

  const captureCategory = await getCategoryForConnector(capture.source_type);
  const check = await checkRules(workspace.id, {
    provider: capture.source_type,
    area: captureCategory ? CATEGORY_TO_AREA[captureCategory] : null,
    entity,
    entityCandidates: ruleMatchCandidatesForEnvelope(captureEnvelope),
  });
  if (check.verdict !== "deny" || !check.rule) {
    return { success: false, error: "No matching keep-out rule found." };
  }

  const removed = await removeRule(workspace.id, check.rule.id);
  if (!removed.success) {
    return { success: false, error: removed.error };
  }

  const gateError = await setGateAction(captureId, workspace.id, "candidate");
  if (gateError) {
    return { success: false, error: gateError };
  }

  // Removing a keep-out rule says the entity was wrongly denied — a
  // positive observation, weaker than an explicit always-allow.
  await recordCorrectionObservation(workspace.id, capture.source_type, entity, 5);

  revalidatePath("/sources");
  revalidatePath("/memory");
  return { success: true };
}

/**
 * "Add to People" (email Kept-Out items): boost the sender toward a Memory
 * contact proposal and put the capture on Watching — consistent with
 * "not straight in": discovery proposes the person, the user confirms.
 */
export async function escalateSenderToWatching(
  captureId: string,
): Promise<CorrectionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const capture = await loadCaptureForCorrection(captureId, workspace.id);
  if (!capture) {
    return { success: false, error: "Capture not found" };
  }

  const entity = await extractFeedbackEntityForEnvelope(
    envelopeForCaptureRow(capture),
  );

  const gateError = await setGateAction(captureId, workspace.id, "candidate");
  if (gateError) {
    return { success: false, error: gateError };
  }

  try {
    await recordFeedback({
      workspaceId: workspace.id,
      captureEventId: captureId,
      feedbackType: "more_like_this",
      senderEmail: entity?.type === "sender_email" ? entity.key : undefined,
    });
  } catch (error) {
    console.error("[corrections] feedback recording failed:", error);
  }

  revalidatePath("/sources");
  revalidatePath("/memory");
  return { success: true };
}
