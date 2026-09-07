/**
 * Composio slug canary cron (Founder Ops Phase 1)
 *
 * Hourly metadata probe of the read-class tool slugs Salt executes
 * (app/_lib/composio/canary.ts). Catches server-side toolkit reworks — the
 * Aug 2026 Outlook break 404'd slugs for weeks with no signal.
 *
 * Secured with CRON_SECRET. Schedule: hourly (vercel.json).
 *
 * Environment semantics: the Composio tool catalog is platform-global, so
 * the probe runs in every deployment, but alert emails fire ONLY when
 * VERCEL_ENV === "production" — staging verifies, production pages.
 *
 * Dead-man's switch: a successful run pings OPS_HEARTBEAT_URL (Better Stack /
 * UptimeRobot free tier) so an external watcher notices if the cron itself
 * dies — the in-app canary can't report its own death.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { formatCanaryAlertEmail, runSlugCanary } from "@/app/_lib/composio/canary";
import { sendOpsAlertEmail } from "@/app/_lib/email/ops-alerts";

export const maxDuration = 120;

const LOG_TAG = "[Composio canary cron]";

async function pingHeartbeat(): Promise<void> {
  const url = process.env.OPS_HEARTBEAT_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch (error) {
    // A heartbeat miss must never fail the canary run — the external
    // watcher treats the missed ping as the signal.
    console.warn(`${LOG_TAG} Heartbeat ping failed:`, error);
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, LOG_TAG);
  if (unauthorized) return unauthorized;

  try {
    const summary = await runSlugCanary();

    console.log(
      `${LOG_TAG} Complete: ${summary.results.length} probed, ` +
        `${summary.failedCount} failed, ${summary.alerts.length} alert(s)`,
    );

    let alertSent = false;
    if (summary.alerts.length > 0) {
      const alertsEnabled = process.env.VERCEL_ENV === "production";
      const email = formatCanaryAlertEmail(summary.alerts);
      if (alertsEnabled) {
        const result = await sendOpsAlertEmail(email);
        alertSent = result.sent;
      } else {
        console.warn(
          `${LOG_TAG} ${summary.alerts.length} alert(s) suppressed ` +
            `(VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}): ${email.subject}`,
        );
      }
    }

    await pingHeartbeat();

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      probed: summary.results.length,
      failed: summary.failedCount,
      failures: summary.results
        .filter((r) => r.status === "failed")
        .map((r) => ({ slug: r.target, errorCode: r.errorCode })),
      alerts: summary.alerts.map((a) => ({
        type: a.type,
        slug: a.slug,
        streak: a.streak,
      })),
      alertSent,
    });
  } catch (error) {
    console.error(`${LOG_TAG} Run failed:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 },
    );
  }
}
