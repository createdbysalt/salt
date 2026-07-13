/**
 * Play Record Creation & Routing
 *
 * Unified interface for creating play records from any source:
 * - Ask Salt tool execution
 * - Keeper playbook execution
 * - Action playbook execution
 * - Manual user actions
 *
 * Implements the confidence × stakes matrix for queue routing,
 * with queue budget awareness for flood prevention.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  shouldRouteToNeedsYou,
  type QueueDecision,
} from "@/app/_lib/learning/queue-budget";
import {
  setExpectedOutcome,
  type OutcomeExpected,
} from "@/app/_lib/learning/outcomes";

// ============================================================================
// Types
// ============================================================================

export type PlayQueue = "needs_you" | "auto_handled";

export type PlayStakes = "low" | "medium" | "high";

export type PlaySource = "ask_salt" | "playbook" | "manual" | "system";

export type PlayTargetType =
  | "person"
  | "organization"
  | "work"
  | "meeting"
  | "file"
  | "billing"
  | "me";

export interface SourceContext {
  source: PlaySource;
  chat_id?: string;
  message_id?: string;
  user_approved_at?: string;
  playbook_slug?: string;
  trigger_signal?: string;
}

export interface CreatePlayRecordInput {
  workspaceId: string;
  playerId?: string;
  playerSlug?: string;
  playbookSlug?: string;
  title: string;
  preview?: string;
  channel?: string;
  channels?: string[];
  draftBody?: string;

  targetType?: PlayTargetType;
  targetId?: string;
  targetLabel?: string;

  confidence?: number;
  stakes?: PlayStakes;

  sourceContext: SourceContext;

  contextInputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  state?: "draft" | "queued" | "ran";

  /** Expected outcome type for tracking (reply, payment, booking, etc.) */
  outcomeExpected?: OutcomeExpected;
  /** Hours to wait for outcome before timing out */
  outcomeWindowHours?: number;
  /** Use budget-aware routing (default true) */
  useBudgetRouting?: boolean;
}

export interface CreatePlayRecordResult {
  playId: string;
  queue: PlayQueue;
  state: string;
}

// ============================================================================
// Stakes Classification
// ============================================================================

/**
 * Classify action stakes based on action type.
 *
 * - High: External actions (email, invoice, booking, publish)
 * - Medium: Internal state changes (Memory updates, drafts)
 * - Low: Read-only, internal enrichment, signal accumulation
 */
export const ACTION_STAKES: Record<string, PlayStakes> = {
  // High stakes - external, hard to undo
  GMAIL_SEND_EMAIL: "high",
  GMAIL_REPLY_TO_THREAD: "high",
  STRIPE_CREATE_INVOICE: "high",
  STRIPE_SEND_INVOICE: "high",
  GOOGLECALENDAR_CREATE_EVENT: "high",
  GOOGLECALENDAR_UPDATE_EVENT: "high",
  SLACK_SEND_MESSAGE: "high",
  DOCUSIGN_SEND_ENVELOPE: "high",

  // Medium stakes - internal state changes
  GMAIL_CREATE_DRAFT: "medium",
  STRIPE_CREATE_DRAFT_INVOICE: "medium",
  memory_update: "medium",
  memory_create: "medium",

  // Low stakes - read-only, internal
  GMAIL_FETCH_EMAILS: "low",
  STRIPE_LIST_INVOICES: "low",
  enrichment: "low",
  signal_accumulation: "low",
};

export function classifyStakes(actionType: string): PlayStakes {
  return ACTION_STAKES[actionType] ?? "medium";
}

// ============================================================================
// Queue Routing
// ============================================================================

/**
 * Route a play to the appropriate queue based on confidence × stakes.
 *
 * Matrix:
 * | Confidence      | Low Stakes   | Medium Stakes  | High Stakes  |
 * |-----------------|--------------|----------------|--------------|
 * | High (≥0.90)    | auto_handled | auto_handled   | needs_you    |
 * | Medium (0.70-0.89) | auto_handled | auto_handled | needs_you    |
 * | Low (<0.70)     | auto_handled | needs_you      | needs_you    |
 *
 * High stakes ALWAYS require approval, regardless of confidence.
 */
export function routePlay(
  confidence: number | null | undefined,
  stakes: PlayStakes | null | undefined
): PlayQueue {
  const conf = confidence ?? 0;
  const stk = stakes ?? "medium";

  // High stakes always need approval
  if (stk === "high") {
    return "needs_you";
  }

  // Medium stakes need approval if confidence is low
  if (stk === "medium" && conf < 70) {
    return "needs_you";
  }

  // Low stakes or high confidence medium stakes = auto
  return "auto_handled";
}

// ============================================================================
// Play Record Creation
// ============================================================================

/**
 * Create a play record with automatic queue routing.
 *
 * All play-generating code paths should use this function to ensure
 * consistent attribution, routing, and activity tracking.
 */
export async function createPlayRecord(
  input: CreatePlayRecordInput
): Promise<CreatePlayRecordResult> {
  const admin = createAdminClient();

  // Determine queue routing
  let queue: PlayQueue;

  // Ask Salt actions approved in chat bypass routing - always auto_handled
  if (input.sourceContext.source === "ask_salt" && input.sourceContext.user_approved_at) {
    queue = "auto_handled";
  } else if (input.useBudgetRouting !== false) {
    const decision = await shouldRouteToNeedsYou(
      input.workspaceId,
      input.stakes ?? "medium",
      input.confidence ?? 0
    );
    queue = decision.decision === "needs_you" ? "needs_you" : "auto_handled";
  } else {
    queue = routePlay(input.confidence, input.stakes);
  }

  // Determine initial state based on source and queue
  let state = input.state ?? "queued";
  if (input.sourceContext.source === "ask_salt" && input.sourceContext.user_approved_at) {
    // Ask Salt actions are pre-approved in chat
    state = "ran";
  } else if (queue === "auto_handled" && state === "queued") {
    // Auto-handled plays go straight to ran
    state = "ran";
  }

  // Get player_id from slug if needed
  let playerId = input.playerId;
  if (!playerId && input.playerSlug) {
    const { data: player } = await admin
      .from("players")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("slug", input.playerSlug)
      .single();
    playerId = player?.id;
  }

  // Insert play run
  const { data: playRun, error } = await admin
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      player_id: playerId,
      title: input.title,
      preview: input.preview,
      channel: input.channel,
      channels: input.channels ?? [],
      draft_body: input.draftBody,
      target_type: input.targetType,
      target_id: input.targetId,
      target_label: input.targetLabel,
      confidence: input.confidence,
      stakes: input.stakes,
      queue,
      state,
      source_context: input.sourceContext,
      context_inputs: input.contextInputs ?? {},
      metadata: input.metadata ?? {},
      ran_at: state === "ran" ? new Date().toISOString() : null,
      outcome_expected: input.outcomeExpected ?? null,
      outcome_window_hours: input.outcomeWindowHours ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Determine if this was auto-executed (no user approval required)
  // Auto-executed = ran state + not from user-approved ask_salt
  const wasAutoExecuted =
    state === "ran" &&
    !(input.sourceContext.source === "ask_salt" && input.sourceContext.user_approved_at);

  // Create activity entry
  await admin.from("activity_entries").insert({
    workspace_id: input.workspaceId,
    play_run_id: playRun.id,
    action: wasAutoExecuted ? "auto_applied" : state === "ran" ? "ran" : "created",
    title: input.title,
    detail: input.preview,
    metadata: {
      queue,
      stakes: input.stakes,
      confidence: input.confidence,
      source: input.sourceContext.source,
      ...(wasAutoExecuted ? { auto_executed: true } : {}),
    },
  });

  return {
    playId: playRun.id,
    queue,
    state,
  };
}

/**
 * Update an existing play's queue assignment.
 * Used when confidence changes or user manually routes.
 */
export async function updatePlayQueue(
  workspaceId: string,
  playId: string,
  queue: PlayQueue,
  reason?: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("play_runs")
    .update({ queue })
    .eq("workspace_id", workspaceId)
    .eq("id", playId);

  if (error) throw error;

  // Log the routing change
  await admin.from("activity_entries").insert({
    workspace_id: workspaceId,
    play_run_id: playId,
    action: "edited",
    title: `Moved to ${queue === "needs_you" ? "Needs You" : "Auto-handled"}`,
    detail: reason,
    metadata: { queue_change: queue },
  });
}
