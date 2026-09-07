import "server-only";

/**
 * Email Triage post-enrichment hook (Capture Quality Repair, Phase C).
 *
 * Classification is capture-scoped, not entity-scoped, so entity-signal
 * dispatch is the wrong vehicle for `email_classified_*` — instead this hook
 * runs the email-triage playbook directly after enrichment stores a
 * classification. The playbook applies Gmail labels immediately and pauses
 * for approval before archiving (earned autonomy flips that gate after
 * enough approvals).
 *
 * Gmail-only for now: the playbook's label tool is GMAIL_MODIFY_MESSAGE_LABELS
 * (Outlook parity is a follow-up).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "@/app/_features/plays/playbooks/schema/v2/executor";
import { updateCaptureWithDispatchResults } from "@/app/_features/plays/playbooks/trigger-dispatch";
import { resolveWorkspaceActor } from "@/app/_features/plays/services/workspace-actor";
import {
  recordInlineToolExecutions,
  collectExecutedToolSlugs,
} from "@/app/_features/plays/services/record-inline-executions";
import type { CaptureEnvelope } from "../adapters/types";
import type { EnrichedMetadata } from "./enrichment/types";

const TRIAGE_PLAYBOOK_SLUG = "email-triage";

export interface EmailTriageHookResult {
  ran: boolean;
  reason?: string;
  status?: "success" | "paused" | "error" | "skipped";
  toolsExecuted?: string[];
}

/**
 * Run the email-triage playbook for a freshly classified capture.
 * Never throws — callers fire-and-forget after enrichment.
 */
export async function runEmailTriageHook(params: {
  captureId: string;
  workspaceId: string;
  envelope: CaptureEnvelope;
  metadata: EnrichedMetadata;
}): Promise<EmailTriageHookResult> {
  const { captureId, workspaceId, envelope, metadata } = params;

  if (envelope.sourceType !== "gmail") {
    return { ran: false, reason: "not a gmail capture" };
  }

  const classification = metadata.email_classification;
  if (!classification) {
    return { ran: false, reason: "no stored classification" };
  }

  const admin = createAdminClient();

  // Idempotency: re-enrichment (intelligence rescans) must not re-apply
  // labels. One triage run per capture: capture_id lives in trigger_evidence
  // (evidence payload); the slug match accepts the canonical location
  // (source_context) or trigger_evidence for rows written before 2026-08-07.
  const { data: existingRun } = await admin
    .from("play_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or(
      `source_context->>playbook_slug.eq.${TRIAGE_PLAYBOOK_SLUG},trigger_evidence->>playbook_slug.eq.${TRIAGE_PLAYBOOK_SLUG}`
    )
    .eq("trigger_evidence->>capture_id", captureId)
    .limit(1)
    .maybeSingle();

  if (existingRun) {
    return { ran: false, reason: "triage already ran for this capture" };
  }

  const playbook = getPlaybookBySlug(TRIAGE_PLAYBOOK_SLUG);
  if (!playbook) {
    return { ran: false, reason: "email-triage playbook not found" };
  }

  const userId = await resolveWorkspaceActor(workspaceId);
  if (!userId) {
    return { ran: false, reason: "no workspace member to act as" };
  }

  const extracted = envelope.extracted as Record<string, unknown>;
  const context = await buildExecutionContextV2(
    workspaceId,
    userId,
    {
      type: "signal",
      signalKey: `email_classified_${classification.category}`,
    },
    playbook.definition.voice,
    {
      id: captureId,
      source_type: envelope.sourceType,
      gmail_message_id: envelope.externalId,
      thread_id: envelope.threadId,
      sender_email: (extracted.sender_email as string) ?? null,
      subject: (extracted.subject as string) ?? null,
    },
    playbook.definition.slug
  );

  const result = await executePlaybookV2(playbook.definition, context);

  const toolsExecuted = collectExecutedToolSlugs(result.stepResults);

  // Record the completed portion (labels applied) even when the archive
  // branch paused — the paused approval run is created by the executor and
  // resumes independently.
  await recordInlineToolExecutions({
    workspaceId,
    playbookSlug: TRIAGE_PLAYBOOK_SLUG,
    title: `Email Triage — ${classification.category}`,
    preview: `Labeled "${(extracted.subject as string) ?? "email"}" as Salt/${classification.category}`,
    triggerSignal: `email_classified_${classification.category}`,
    evidence: {
      capture_id: captureId,
      category: classification.category,
      triage_action: classification.triage_action,
      execution_status: result.status,
    },
    toolSlugs: toolsExecuted,
  });

  // Reflect the run on the capture so Sources → Activity shows "Triggered
  // Play" instead of "No action" for triaged mail. The entity-signal
  // dispatch path already does this; the triage hook bypasses it because
  // classification is capture-scoped.
  if (result.playRunIds?.length) {
    try {
      await updateCaptureWithDispatchResults(
        captureId,
        result.playRunIds.map((playRunId) => ({
          success: true,
          playbookSlug: TRIAGE_PLAYBOOK_SLUG,
          playRunId,
        }))
      );
    } catch (dispatchError) {
      console.warn(
        "[email-triage-hook] Failed to record plays_dispatched for %s:",
        captureId,
        dispatchError instanceof Error ? dispatchError.message : dispatchError
      );
    }
  }

  return {
    ran: true,
    status: result.status,
    toolsExecuted,
  };
}
