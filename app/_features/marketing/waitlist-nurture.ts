/**
 * Processes due waitlist nurture emails (signup-relative drip via Resend).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sendWaitlistSequenceEmail } from "@/app/_lib/email/waitlist-sequence-send";
import {
  appendSentWaitlistSequenceSlug,
  canSendWaitlistSequenceEmail,
  getDueWaitlistSequenceSlug,
  normalizeWaitlistEmailSequence,
  type WaitlistEmailSequenceState,
} from "@/app/_lib/email/waitlist-sequence-schedule";
import type { WaitlistLeadMetadata } from "@/app/_features/marketing/waitlist-lead";

export type WaitlistNurtureProcessResult = {
  scanned: number;
  sent: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
};

type WaitlistLeadRow = {
  id: string;
  email: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function resolveEnrolledAt(
  metadata: WaitlistLeadMetadata & { email_sequence?: WaitlistEmailSequenceState }
): string {
  return (
    metadata.email_sequence?.enrolled_at ??
    metadata.completed_at ??
    new Date().toISOString()
  );
}

function buildUpdatedMetadata(
  metadata: Record<string, unknown>,
  sequence: WaitlistEmailSequenceState
): Record<string, unknown> {
  return {
    ...metadata,
    email_sequence: sequence,
  };
}

export async function processDueWaitlistNurtureEmails(options?: {
  now?: Date;
  limit?: number;
}): Promise<WaitlistNurtureProcessResult> {
  const supabase = createAdminClient();
  const limit = options?.limit ?? 100;
  const now = options?.now ?? new Date();

  const { data: rows, error } = await supabase
    .from("waitlist_leads")
    .select("id, email, metadata, created_at")
    .filter("metadata->>status", "eq", "complete")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`waitlist_leads query failed: ${error.message}`);
  }

  const result: WaitlistNurtureProcessResult = {
    scanned: rows?.length ?? 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  if (!rows?.length) {
    return result;
  }

  for (const row of rows as WaitlistLeadRow[]) {
    const rawMetadata = row.metadata ?? {};
    const status = rawMetadata.status;
    if (status !== "complete") {
      result.skipped += 1;
      continue;
    }

    const baseMetadata = rawMetadata as WaitlistLeadMetadata & {
      email_sequence?: WaitlistEmailSequenceState;
    };
    const enrolledAt =
      baseMetadata.completed_at ?? row.created_at ?? new Date().toISOString();
    const sequence = normalizeWaitlistEmailSequence(
      rawMetadata.email_sequence,
      resolveEnrolledAt(baseMetadata) || enrolledAt
    );

    const dueSlug = getDueWaitlistSequenceSlug({
      enrolledAt: sequence.enrolled_at,
      sent: sequence.sent,
      now,
    });

    if (!dueSlug) {
      result.skipped += 1;
      continue;
    }

    if (!canSendWaitlistSequenceEmail(dueSlug)) {
      result.skipped += 1;
      continue;
    }

    try {
      await sendWaitlistSequenceEmail({ to: row.email, slug: dueSlug });

      const updatedSequence = appendSentWaitlistSequenceSlug(sequence, dueSlug);
      const { error: updateError } = await supabase
        .from("waitlist_leads")
        .update({
          metadata: buildUpdatedMetadata(rawMetadata, updatedSequence),
        })
        .eq("id", row.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      result.sent += 1;
    } catch (err) {
      result.errors.push({
        email: row.email,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}
