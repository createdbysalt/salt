/**
 * Email Digest Cron
 *
 * Runs the email-digest v2 playbook per workspace: batched low-priority mail
 * (classifier triage_action = batch_digest) plus the held pool's new senders
 * (Memory-first policy) become one daily briefing play run.
 *
 * Secured with CRON_SECRET. Scheduled daily at 18:00 UTC (vercel.json) to
 * match the playbook's declared schedule. Workspaces with nothing to digest
 * are skipped before any LLM spend; EMAIL_DIGEST_MAX_WORKSPACES caps a run.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { runEmailDigestCron } from "@/app/_features/capture/services/email-digest-cron";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Email digest cron]");
  if (unauthorized) return unauthorized;

  try {
    const result = await runEmailDigestCron();

    if (result.errors.length > 0) {
      console.warn(
        `[Email digest cron] ${result.errors.length} error(s):`,
        result.errors.slice(0, 5).join("; ")
      );
    }

    console.log(
      `[Email digest cron] Complete: ${result.workspacesConsidered} workspaces, ` +
        `${result.digestsCreated} digests, ${result.skippedEmpty} skipped empty, ` +
        `${Date.now() - startTime}ms`
    );

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      workspacesConsidered: result.workspacesConsidered,
      digestsCreated: result.digestsCreated,
      skippedEmpty: result.skippedEmpty,
      errors: result.errors.length,
    });
  } catch (error) {
    console.error("[Email digest cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 }
    );
  }
}
