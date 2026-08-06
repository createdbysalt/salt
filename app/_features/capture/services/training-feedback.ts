/**
 * Training Feedback Service
 *
 * Records user corrections and feedback to improve email classification over time.
 * Feedback signals are accumulated as evidence and used to adjust sender profiles.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export type FeedbackType =
  | "more_like_this"
  | "less_like_this"
  | "mark_important"
  | "mark_not_important"
  | "correct_category"
  | "correct_priority";

export type TriageAction =
  | "archive"
  | "archive_unread"
  | "reply"
  | "snooze"
  | "mark_important"
  | "move_to_batch";

export interface RecordFeedbackInput {
  workspaceId: string;
  captureEventId: string;
  feedbackType: FeedbackType;
  previousValue?: string;
  newValue?: string;
  senderEmail?: string;
}

export interface RecordTriageInput {
  workspaceId: string;
  captureEventId: string;
  action: TriageAction;
  timeToActionMs?: number;
  senderEmail?: string;
}

export async function recordFeedback(input: RecordFeedbackInput): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("capture_training_feedback").insert({
    workspace_id: input.workspaceId,
    capture_event_id: input.captureEventId,
    feedback_type: input.feedbackType,
    previous_value: input.previousValue,
    new_value: input.newValue,
    sender_email: input.senderEmail,
    created_at: new Date().toISOString(),
  });

  if (input.senderEmail) {
    await updateSenderProfileFromFeedback(
      input.workspaceId,
      input.senderEmail,
      input.feedbackType
    );
  }
}

export async function recordTriageAction(input: RecordTriageInput): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("capture_triage_actions").insert({
    workspace_id: input.workspaceId,
    capture_event_id: input.captureEventId,
    action: input.action,
    time_to_action_ms: input.timeToActionMs,
    sender_email: input.senderEmail,
    created_at: new Date().toISOString(),
  });

  if (input.senderEmail) {
    await updateSenderProfileFromTriage(
      input.workspaceId,
      input.senderEmail,
      input.action,
      input.timeToActionMs
    );
  }
}

async function updateSenderProfileFromFeedback(
  workspaceId: string,
  senderEmail: string,
  feedbackType: FeedbackType
): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("capture_sender_profiles")
    .select("id, reputation_score")
    .eq("workspace_id", workspaceId)
    .eq("sender_key", senderEmail.toLowerCase())
    .eq("sender_key_type", "email")
    .single();

  if (!existing) return;

  let reputationDelta = 0;

  switch (feedbackType) {
    case "more_like_this":
    case "mark_important":
      reputationDelta = 10;
      break;
    case "less_like_this":
    case "mark_not_important":
      reputationDelta = -10;
      break;
    case "correct_category":
    case "correct_priority":
      reputationDelta = 0;
      break;
  }

  if (reputationDelta !== 0) {
    const newScore = Math.max(
      0,
      Math.min(100, (existing.reputation_score ?? 50) + reputationDelta)
    );

    await supabase
      .from("capture_sender_profiles")
      .update({
        reputation_score: newScore,
        last_calculated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  }
}

async function updateSenderProfileFromTriage(
  workspaceId: string,
  senderEmail: string,
  action: TriageAction,
  timeToActionMs?: number
): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("capture_sender_profiles")
    .select("id, capture_count, user_archived_count, user_replied_count, reputation_score")
    .eq("workspace_id", workspaceId)
    .eq("sender_key", senderEmail.toLowerCase())
    .eq("sender_key_type", "email")
    .single();

  if (!existing) return;

  const updates: Record<string, unknown> = {
    capture_count: (existing.capture_count ?? 0) + 1,
    last_calculated_at: new Date().toISOString(),
  };

  let reputationDelta = 0;
  const isFast = timeToActionMs !== undefined && timeToActionMs < 30000;

  switch (action) {
    case "archive":
      updates.user_archived_count = (existing.user_archived_count ?? 0) + 1;
      if (isFast) reputationDelta = -5;
      break;

    case "archive_unread":
      updates.user_archived_count = (existing.user_archived_count ?? 0) + 1;
      reputationDelta = -10;
      break;

    case "reply":
      updates.user_replied_count = (existing.user_replied_count ?? 0) + 1;
      if (isFast) reputationDelta = 10;
      else reputationDelta = 5;
      break;

    case "mark_important":
      reputationDelta = 15;
      break;

    case "move_to_batch":
      reputationDelta = -3;
      break;

    case "snooze":
      break;
  }

  if (reputationDelta !== 0) {
    updates.reputation_score = Math.max(
      0,
      Math.min(100, (existing.reputation_score ?? 50) + reputationDelta)
    );
  }

  const captureCount = (updates.capture_count as number) ?? existing.capture_count ?? 1;
  const repliedCount = (updates.user_replied_count as number) ?? existing.user_replied_count ?? 0;
  if (captureCount > 0) {
    updates.response_rate = repliedCount / captureCount;
  }

  await supabase
    .from("capture_sender_profiles")
    .update(updates)
    .eq("id", existing.id);
}

export function deriveFeedbackSignal(
  feedbackType: FeedbackType
): string | null {
  switch (feedbackType) {
    case "more_like_this":
      return "email_training_more_like_this";
    case "less_like_this":
      return "email_training_less_like_this";
    case "mark_important":
      return "email_marked_important";
    default:
      return null;
  }
}

export function deriveTriageSignal(action: TriageAction, isFast: boolean): string | null {
  switch (action) {
    case "archive":
      return isFast ? "email_archived_fast" : null;
    case "archive_unread":
      return "email_archived_unread";
    case "reply":
      return isFast ? "email_replied_fast" : null;
    case "snooze":
      return "email_snoozed";
    case "mark_important":
      return "email_marked_important";
    default:
      return null;
  }
}
