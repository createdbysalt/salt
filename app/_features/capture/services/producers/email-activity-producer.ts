import "server-only";

/**
 * Email activity rollup (Track D of the zero-pills sourcing plan).
 *
 * Counts a person's email captures over the rolling 90-day window and
 * dispatches `email_count_gte_5` when the bar clears — the records
 * capability's recordStatus rule ("Recent email activity indicates active
 * relationship") does the write. Runs on evidence arrival, right after the
 * person-field producer, so the count reflects the just-absorbed mail.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";

const EMAIL_SOURCE_TYPES = ["gmail", "outlook"] as const;
const ACTIVITY_WINDOW_DAYS = 90;
const EMAIL_COUNT_BAR = 5;

export async function produceEmailActivityRollup(input: {
  workspaceId: string;
  personId: string;
  /** Producer label for evidence, e.g. the connector sourceType. */
  source: string;
  captureId?: string;
}): Promise<{ emailCount: number; dispatched: boolean }> {
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { count } = await admin
    .from("capture_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId)
    .eq("resolved_person_id", input.personId)
    .eq("capture_type", "message")
    .in("source_type", [...EMAIL_SOURCE_TYPES])
    .gte("created_at", since);

  const emailCount = count ?? 0;
  if (emailCount < EMAIL_COUNT_BAR) {
    return { emailCount, dispatched: false };
  }

  await runCareForSignal({
    workspaceId: input.workspaceId,
    entityType: "person",
    entityId: input.personId,
    signalKey: "email_count_gte_5",
    evidence: {
      source: input.source,
      captureId: input.captureId,
      signalValues: { email_count_gte_5: true },
    },
  });
  return { emailCount, dispatched: true };
}
