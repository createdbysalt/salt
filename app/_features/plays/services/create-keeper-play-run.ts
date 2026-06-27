import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { PersonProfileFieldKey } from "@/app/_features/plays/playbooks/profile/types";

/**
 * Keeper Play Run creation service.
 *
 * This is the single write path for Keeper-originated plays (profile suggestions
 * and relationship questions). All Keeper output that belongs in the approval
 * queue should flow through here, NOT through intelligence_findings.
 *
 * See docs/plans/2026-06-25-play-card-contract.md (Phase 2).
 */

export interface CreateKeeperProfilePlayRunInput {
  workspaceId: string;
  personId: string;
  personName: string;
  field: PersonProfileFieldKey;
  proposedValue: string;
  because: string | null;
  confidence: number;
  sourceUrl: string | null;
  triggerLabel: string | null;
  /** If high confidence (≥85), auto-handle instead of queuing for approval. */
  autoHandle?: boolean;
}

export interface CreateKeeperQuestionPlayRunInput {
  workspaceId: string;
  personId: string;
  personName: string;
  field: PersonProfileFieldKey;
  prompt: string;
  options: Array<{ value: string; label: string }>;
  sourceUrl: string | null;
  triggerLabel: string | null;
}

export type CreateKeeperPlayRunResult =
  | { ok: true; playRunId: string; autoHandled: boolean }
  | { ok: false; error: string };

const FIELD_LABELS: Record<string, string> = {
  relationship_type: "relationship",
  role: "role",
  company: "company",
  location: "location",
};

function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

function formatPrimaryLabel(field: string, value: string): string {
  const fieldLabel = formatFieldLabel(field);
  if (field === "relationship_type") {
    return `Save as ${value.charAt(0).toUpperCase() + value.slice(1)}`;
  }
  return `Save ${fieldLabel}`;
}

/**
 * Create a profile-type play_run for a Keeper suggestion.
 *
 * This replaces the previous flow of inserting into intelligence_findings
 * with keeper_profile metadata. The play_run will appear in the Plays queue
 * and can be approved via applyKeeperPlayRun.
 */
export async function createKeeperProfilePlayRun(
  input: CreateKeeperProfilePlayRunInput
): Promise<CreateKeeperPlayRunResult> {
  const supabase = createAdminClient();

  const shouldAutoHandle = input.autoHandle && input.confidence >= 85;
  const state = shouldAutoHandle ? "approved" : "queued";

  const title = `Mark ${input.personName} as ${input.proposedValue}`;
  const preview = input.because ?? `Keeper suggests ${formatFieldLabel(input.field)} based on recent signals.`;

  const { data: run, error: insertError } = await supabase
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      target_type: "person",
      target_id: input.personId,
      target_label: input.personName,
      state,
      title,
      preview,
      confidence: input.confidence,
      metadata: {
        player_slug: "keeper",
        playbook_name: "People Records",
        keeper_profile: true,
        profile_field: input.field,
        profile_value: input.proposedValue,
        because: input.because,
        primary_label: formatPrimaryLabel(input.field, input.proposedValue),
        trigger_label: input.triggerLabel ?? "From email",
        source_url: input.sourceUrl,
      },
      approved_at: shouldAutoHandle ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertError || !run) {
    return { ok: false, error: insertError?.message ?? "Could not create play run" };
  }

  // If auto-handled, also apply the profile field immediately
  if (shouldAutoHandle) {
    const { approveProfileFieldSuggestion } = await import(
      "@/app/_features/people/actions/profile-fields"
    );
    await approveProfileFieldSuggestion({
      personId: input.personId,
      field: input.field,
    });
  }

  return { ok: true, playRunId: run.id as string, autoHandled: Boolean(shouldAutoHandle) };
}

/**
 * Create a question-type play_run for a Keeper classification question.
 *
 * When Keeper isn't confident enough to suggest a value but has enough signal
 * to ask, it creates a question play. The user picks from one-tap options.
 */
export async function createKeeperQuestionPlayRun(
  input: CreateKeeperQuestionPlayRunInput
): Promise<CreateKeeperPlayRunResult> {
  const supabase = createAdminClient();

  const { data: run, error: insertError } = await supabase
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      target_type: "person",
      target_id: input.personId,
      target_label: input.personName,
      state: "queued",
      title: input.prompt,
      preview: `Salt couldn't determine the ${formatFieldLabel(input.field)}. Pick one.`,
      confidence: null,
      metadata: {
        player_slug: "keeper",
        playbook_name: "People Records",
        keeper_question: true,
        question_field: input.field,
        question_options: input.options,
        trigger_label: input.triggerLabel ?? "From email",
        source_url: input.sourceUrl,
      },
    })
    .select("id")
    .single();

  if (insertError || !run) {
    return { ok: false, error: insertError?.message ?? "Could not create play run" };
  }

  return { ok: true, playRunId: run.id as string, autoHandled: false };
}

// --- Risk and Routing Play Runs (Phase 3) ---

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
}

/**
 * Create a risk-type play_run for client risk signals.
 *
 * Replaces direct intelligence_findings inserts for revenue_risk findings.
 * These appear in the Plays queue with the risk body slot.
 */
export async function createRiskPlayRun(
  input: CreateRiskPlayRunInput
): Promise<CreateKeeperPlayRunResult> {
  const supabase = createAdminClient();

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
      title: input.title,
      preview: input.signal,
      confidence: input.confidence,
      metadata: {
        player_slug: "keeper",
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
): Promise<CreateKeeperPlayRunResult> {
  const supabase = createAdminClient();

  const { data: run, error: insertError } = await supabase
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      target_type: null,
      target_id: null,
      target_label: input.fromName?.trim() || input.fromEmail,
      state: "queued",
      title: input.title,
      preview: input.preview,
      confidence: input.confidence,
      metadata: {
        player_slug: "keeper",
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
