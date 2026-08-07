import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { PlayQueue, PlayStakes } from "@/app/_features/plays/lib/play-record";

/**
 * Finding play_run creation service.
 *
 * Creates play_runs for capture-intelligence findings that genuinely need a
 * human decision: client-risk signals and routing (unmatched sender)
 * classifications.
 *
 * Memory mutations do NOT flow through here — Memory Care
 * (app/_features/memory/care) handles those with tiered confidence bars and
 * transparency via Memory → Filter, not approval queues.
 */

export type CreateFindingPlayRunResult =
  | { ok: true; playRunId: string; autoHandled: boolean }
  | { ok: false; error: string };

export interface CreateRiskPlayRunInput {
  workspaceId: string;
  personId: string | null;
  orgId: string | null;
  targetLabel: string;
  title: string;
  signal: string;
  recommendation: string | null;
  confidence: number;
  sourceUrl: string | null;
  triggerLabel: string;
  captureId: string | null;
  evidenceQuotes: string[];
  /** Links to entity_evidence records that triggered this play. */
  evidenceIds?: string[];
}

export interface CreateRoutingPlayRunInput {
  workspaceId: string;
  title: string;
  preview: string;
  confidence: number;
  sourceUrl: string | null;
  triggerLabel: string;
  captureId: string | null;
  evidenceQuotes: string[];
  fromEmail: string;
  fromName: string | null;
  paymentPayerHint: string | null;
  /** Links to entity_evidence records that triggered this play. */
  evidenceIds?: string[];
}

/**
 * Create a risk-type play_run for client risk signals.
 *
 * Replaces direct intelligence_findings inserts for revenue_risk findings.
 * These appear in the Plays queue with the risk body slot.
 */
export async function createRiskPlayRun(
  input: CreateRiskPlayRunInput
): Promise<CreateFindingPlayRunResult> {
  const supabase = createAdminClient();

  // Risk signals are high stakes - always need user attention
  const stakes: PlayStakes = "high";
  const queue: PlayQueue = "needs_you";

  const targetType = input.personId ? "person" : input.orgId ? "org" : null;
  const targetId = input.personId ?? input.orgId;

  const { data: run, error: insertError } = await supabase
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      target_type: targetType,
      target_id: targetId,
      target_label: input.targetLabel,
      state: "queued",
      queue,
      stakes,
      title: input.title,
      preview: input.signal,
      confidence: input.confidence,
      source_context: {
        source: "playbook",
        playbook_slug: "client-risk",
        trigger_signal: input.triggerLabel,
      },
      evidence_ids: input.evidenceIds ?? [],
      metadata: {
        playbook_name: "Client Risk",
        play_card_kind: "risk",
        risk_signal: input.signal,
        risk_recommendation: input.recommendation,
        trigger_label: input.triggerLabel,
        source_url: input.sourceUrl,
        capture_id: input.captureId,
        evidence_quotes: input.evidenceQuotes,
      },
    })
    .select("id")
    .single();

  if (insertError || !run) {
    return { ok: false, error: insertError?.message ?? "Could not create risk play run" };
  }

  return { ok: true, playRunId: run.id as string, autoHandled: false };
}

/**
 * Create a routing-type play_run for needs_routing signals.
 *
 * When Salt finds a signal but can't determine which person/org it belongs to,
 * it creates a routing play for the user to classify.
 */
export async function createRoutingPlayRun(
  input: CreateRoutingPlayRunInput
): Promise<CreateFindingPlayRunResult> {
  const supabase = createAdminClient();

  // Routing is medium stakes - needs user decision but no external action
  const stakes: PlayStakes = "medium";
  // Routing always needs user input to classify
  const queue: PlayQueue = "needs_you";

  const { data: run, error: insertError } = await supabase
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      target_type: null,
      target_id: null,
      target_label: input.fromName?.trim() || input.fromEmail,
      state: "queued",
      queue,
      stakes,
      title: input.title,
      preview: input.preview,
      confidence: input.confidence,
      source_context: {
        source: "playbook",
        playbook_slug: "route-signal",
        trigger_signal: input.triggerLabel,
      },
      evidence_ids: input.evidenceIds ?? [],
      metadata: {
        playbook_name: "Route Signal",
        play_card_kind: "routing",
        from_email: input.fromEmail,
        from_name: input.fromName,
        payment_payer_hint: input.paymentPayerHint,
        trigger_label: input.triggerLabel,
        source_url: input.sourceUrl,
        capture_id: input.captureId,
        evidence_quotes: input.evidenceQuotes,
      },
    })
    .select("id")
    .single();

  if (insertError || !run) {
    return { ok: false, error: insertError?.message ?? "Could not create routing play run" };
  }

  return { ok: true, playRunId: run.id as string, autoHandled: false };
}
