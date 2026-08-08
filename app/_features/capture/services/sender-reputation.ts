import "server-only";

/**
 * Sender Reputation (Capture Quality Repair, Phase C2).
 *
 * capture_sender_profiles carries per-workspace behavioral reputation
 * (0-100, replied/archived counts, response rate). This module closes the
 * two dead ends around it:
 *
 * - Read side: loadSenderReputation feeds the email classifier's
 *   senderProfiles map (previously always empty).
 * - Implicit write loop: recordOutboundReplies bumps the recipient's
 *   profile whenever the user sends mail — outbound mail is already
 *   captured, so reputation becomes self-building with no UI.
 *
 * Explicit feedback (More/Less like this) writes through
 * training-feedback.ts; both paths converge on the same table.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { TablesUpdate } from "@/app/_lib/supabase/database.types";
import type { SenderReputation } from "./email-classification";

const REPLY_REPUTATION_DELTA = 5;
const MAX_RECIPIENTS_PER_MESSAGE = 10;

interface SenderProfileRow {
  id: string;
  capture_count: number | null;
  user_archived_count: number | null;
  user_replied_count: number | null;
  reputation_score: number | null;
  response_rate: number | null;
  avg_response_time_hours: number | null;
  last_calculated_at: string | null;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/**
 * Load the sender's learned reputation for classification. Returns null when
 * the workspace has no history with this sender (classifier treats that as
 * first contact).
 */
export async function loadSenderReputation(
  workspaceId: string,
  senderEmail: string
): Promise<SenderReputation | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("capture_sender_profiles")
    .select(
      "id, capture_count, user_archived_count, user_replied_count, reputation_score, response_rate, avg_response_time_hours, last_calculated_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("sender_key", senderEmail.toLowerCase())
    .eq("sender_key_type", "email")
    .maybeSingle();

  if (!data) return null;
  const row = data as SenderProfileRow;

  return {
    responseRate: row.response_rate ?? 0,
    avgResponseTimeHours: row.avg_response_time_hours,
    captureCount: row.capture_count ?? 0,
    archivedCount: row.user_archived_count ?? 0,
    repliedCount: row.user_replied_count ?? 0,
    reputationScore: row.reputation_score ?? 50,
    lastCalculatedAt: row.last_calculated_at,
  };
}

/**
 * Implicit reply loop: the user sent mail — count it as engagement with each
 * recipient. Creates the profile if it doesn't exist yet, so reputation
 * accrues before Salt has ever classified inbound mail from that sender.
 */
export async function recordOutboundReplies(
  workspaceId: string,
  recipientEmails: readonly string[]
): Promise<void> {
  const emails = [
    ...new Set(
      recipientEmails
        .filter((e): e is string => typeof e === "string" && e.includes("@"))
        .map((e) => e.toLowerCase().trim())
    ),
  ].slice(0, MAX_RECIPIENTS_PER_MESSAGE);
  if (emails.length === 0) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  for (const email of emails) {
    const { data: existing } = await admin
      .from("capture_sender_profiles")
      .select("id, capture_count, user_replied_count, reputation_score")
      .eq("workspace_id", workspaceId)
      .eq("sender_key", email)
      .eq("sender_key_type", "email")
      .maybeSingle();

    if (existing) {
      const repliedCount = (existing.user_replied_count ?? 0) + 1;
      const captureCount = existing.capture_count ?? 0;
      const updates: TablesUpdate<"capture_sender_profiles"> = {
        user_replied_count: repliedCount,
        reputation_score: clampScore(
          (existing.reputation_score ?? 50) + REPLY_REPUTATION_DELTA
        ),
        last_calculated_at: now,
      };
      if (captureCount > 0) {
        updates.response_rate = Math.min(1, repliedCount / captureCount);
      }
      await admin
        .from("capture_sender_profiles")
        .update(updates)
        .eq("id", existing.id);
    } else {
      // Someone you email is a relationship, not a vendor feed — seed as
      // client-kind with moderate confidence; later evidence adjusts it.
      const { error } = await admin.from("capture_sender_profiles").insert({
        workspace_id: workspaceId,
        sender_key: email,
        sender_key_type: "email",
        kind: "client",
        source: "auto_scan",
        confidence: 60,
        user_replied_count: 1,
        reputation_score: clampScore(50 + REPLY_REPUTATION_DELTA),
        last_calculated_at: now,
      } as never);
      if (error && error.code !== "23505") {
        console.warn(
          `[sender-reputation] failed to seed profile for ${email}: ${error.message}`
        );
      }
    }
  }
}
