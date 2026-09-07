/**
 * Manual Composio slug canary run (Founder Ops Phase 1).
 *
 * Runs the exact code path the /api/cron/composio-canary route uses, against
 * whichever Supabase the env points at. Use it to verify the canary on
 * staging without waiting for the hourly cron: the first run probes and
 * writes rows; run twice back-to-back with a dead slug in CANARY_SLUGS (or
 * --simulate-failure) to watch the 2-consecutive-failure alert fire.
 *
 * Alert emails are NEVER sent from this script — it prints what the cron
 * would send instead (the route owns the VERCEL_ENV=production gate).
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" \
 *     pnpm tsx scripts/run-composio-canary.ts [--simulate-failure=<SLUG>]
 */

import { formatCanaryAlertEmail, runSlugCanary } from "@/app/_lib/composio/canary";

const simulateArg = process.argv.find((a) => a.startsWith("--simulate-failure="));
const simulateFailure = simulateArg ? simulateArg.split("=")[1] : null;

async function main() {
  const summary = await runSlugCanary(
    simulateFailure
      ? {
          probe: async (slug) => {
            if (slug === simulateFailure) {
              const cause = Object.assign(new Error("Tool_ToolNotFound"), {
                status: 404,
              });
              throw Object.assign(
                new Error(`Unable to retrieve tool with slug ${slug}`),
                { cause },
              );
            }
            const { getComposioClient } = await import(
              "@/app/_lib/composio/client"
            );
            return getComposioClient().tools.getRawComposioToolBySlug(slug);
          },
        }
      : undefined,
  );

  console.log(
    `Probed ${summary.results.length} slugs: ${summary.failedCount} failed, ` +
      `${summary.alerts.length} alert(s)`,
  );
  for (const result of summary.results) {
    if (result.status === "failed") {
      console.log(
        `  FAILED ${result.target} (${result.toolkit}): ${result.errorCode} — ${result.errorMessage}`,
      );
    }
  }

  if (summary.alerts.length > 0) {
    const email = formatCanaryAlertEmail(summary.alerts);
    console.log("\n--- alert email (NOT sent from script) ---");
    console.log(`Subject: ${email.subject}`);
    console.log(email.lines.join("\n"));
  }
}

void main();
