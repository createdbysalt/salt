/**
 * Backfill metadata.email_sequence.enrolled_at for completed waitlist leads.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  normalizeWaitlistEmailSequence,
  type WaitlistEmailSequenceState,
} from "@/app/_lib/email/waitlist-sequence-schedule";

export type WaitlistEmailSequenceBackfillResult = {
  total: number;
  updated: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
};

type WaitlistLeadRow = {
  id: string;
  email: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const PAGE_SIZE = 200;

function isCompleteWaitlistLead(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  return (metadata as Record<string, unknown>).status === "complete";
}

function resolveEnrollmentTimestamp(
  metadata: Record<string, unknown>,
  createdAt: string
): string {
  const completedAt =
    typeof metadata.completed_at === "string" ? metadata.completed_at : undefined;
  return completedAt ?? createdAt;
}

function hasExplicitEnrolledAt(metadata: Record<string, unknown>): boolean {
  const raw = metadata.email_sequence;
  if (!raw || typeof raw !== "object") {
    return false;
  }

  const enrolledAt = (raw as Record<string, unknown>).enrolled_at;
  if (typeof enrolledAt !== "string") {
    return false;
  }

  return !Number.isNaN(new Date(enrolledAt).getTime());
}

export function buildBackfilledEmailSequence(
  metadata: Record<string, unknown>,
  createdAt: string
): WaitlistEmailSequenceState {
  const enrolledAt = resolveEnrollmentTimestamp(metadata, createdAt);
  return normalizeWaitlistEmailSequence(metadata.email_sequence, enrolledAt);
}

/** Restart nurture timing as if signup happened at `anchorEnrolledAt` (clears sent[]). */
export function buildRestartedWaitlistEmailSequence(
  anchorEnrolledAt: string
): WaitlistEmailSequenceState {
  return {
    enrolled_at: anchorEnrolledAt,
    sent: [],
  };
}

export async function backfillWaitlistEmailSequenceEnrollment(options?: {
  dryRun?: boolean;
  force?: boolean;
  /** When set, every completed lead gets this enrolled_at and an empty sent[]. */
  restartAsAnchor?: string;
  onProgress?: (processed: number, total: number) => void;
}): Promise<WaitlistEmailSequenceBackfillResult> {
  const supabase = createAdminClient();
  const dryRun = options?.dryRun ?? false;
  const force = options?.force ?? false;
  const restartAsAnchor = options?.restartAsAnchor;

  const rows: WaitlistLeadRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("waitlist_leads")
      .select("id, email, metadata, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`waitlist_leads query failed: ${error.message}`);
    }

    if (!data?.length) {
      break;
    }

    for (const row of data as WaitlistLeadRow[]) {
      if (isCompleteWaitlistLead(row.metadata)) {
        rows.push(row);
      }
    }

    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  const result: WaitlistEmailSequenceBackfillResult = {
    total: rows.length,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  let processed = 0;
  for (const row of rows) {
    processed += 1;
    options?.onProgress?.(processed, rows.length);

    const metadata = row.metadata ?? {};

    if (!restartAsAnchor && !force && hasExplicitEnrolledAt(metadata)) {
      result.skipped += 1;
      continue;
    }

    const sequence = restartAsAnchor
      ? buildRestartedWaitlistEmailSequence(restartAsAnchor)
      : buildBackfilledEmailSequence(metadata, row.created_at);
    const nextMetadata = {
      ...metadata,
      email_sequence: sequence,
    };

    if (dryRun) {
      result.updated += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("waitlist_leads")
      .update({ metadata: nextMetadata })
      .eq("id", row.id);

    if (updateError) {
      result.errors.push({
        email: row.email,
        error: updateError.message,
      });
      continue;
    }

    result.updated += 1;
  }

  return result;
}
