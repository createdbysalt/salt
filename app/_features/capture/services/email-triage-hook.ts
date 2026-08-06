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
import { recordPlayExecution } from "@/app/_lib/usage/record-play-usage";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "@/app/_features/plays/playbooks/schema/v2/executor";
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
  // labels. One triage run per capture, keyed through trigger_evidence.
  const { data: existingRun } = await admin
    .from("play_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("trigger_evidence->>playbook_slug", TRIAGE_PLAYBOOK_SLUG)
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
    }
  );

  const result = await executePlaybookV2(playbook.definition, context);

  const toolsExecuted = result.stepResults
    .filter(
      (step) =>
        step.status === "success" &&
        typeof step.data === "object" &&
        step.data !== null &&
        (step.data as Record<string, unknown>).executed === true &&
        typeof (step.data as Record<string, unknown>).tool === "string"
    )
    .map((step) => (step.data as Record<string, unknown>).tool as string);

  // Record the completed portion (labels applied) even when the archive
  // branch paused — the paused approval run is created by the executor and
  // resumes independently.
  if (toolsExecuted.length > 0) {
    const { data: run } = await admin
      .from("play_runs")
      .insert({
        workspace_id: workspaceId,
        state: "auto_handled",
        title: `Email Triage — ${classification.category}`,
        preview: `Labeled "${(extracted.subject as string) ?? "email"}" as Salt/${classification.category}`,
        trigger_source: "signal",
        trigger_evidence: {
          playbook_slug: TRIAGE_PLAYBOOK_SLUG,
          capture_id: captureId,
          category: classification.category,
          triage_action: classification.triage_action,
        },
        context_inputs: {
          tools_executed: toolsExecuted,
          execution_status: result.status,
        },
      })
      .select("id")
      .single();

    if (run) {
      try {
        await recordPlayExecution({
          workspaceId,
          playRunId: run.id as string,
          toolSlugs: toolsExecuted,
        });
      } catch (error) {
        console.error(
          "[email-triage-hook] failed to meter triage run",
          run.id,
          error
        );
      }
    }
  }

  return {
    ran: true,
    status: result.status,
    toolsExecuted,
  };
}

/**
 * A cron-context playbook run needs a human to act as (audit provenance +
 * LLM billing). Prefer the workspace owner, fall back to any member.
 */
async function resolveWorkspaceActor(workspaceId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: owner } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (owner?.user_id) return owner.user_id as string;

  const { data: member } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  return (member?.user_id as string) ?? null;
}
