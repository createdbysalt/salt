/**
 * Backfill Resend waitlist audience with completed signups only.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   RESEND_WAITLIST_AUDIENCE_ID
 *
 * Usage:
 *   pnpm waitlist:resend-sync
 *   pnpm waitlist:resend-sync -- --dry-run
 *   pnpm waitlist:resend-sync:op
 */

import {
  getWaitlistAudienceId,
  syncCompleteWaitlistLeadsToResendAudience,
} from "../app/_lib/email/resend-waitlist-audience";

function parseDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

async function main() {
  const dryRun = parseDryRun(process.argv.slice(2));

  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  const audienceId = getWaitlistAudienceId();
  if (!audienceId && !dryRun) {
    console.error("Missing RESEND_WAITLIST_AUDIENCE_ID");
    console.error("Create an audience in Resend → Audiences, then set the ID in env.");
    process.exit(1);
  }

  console.log(
    dryRun
      ? "Dry run — listing completed waitlist leads (no Resend writes)"
      : `Syncing completed waitlist leads to Resend audience ${audienceId}`
  );

  const result = await syncCompleteWaitlistLeadsToResendAudience({
    dryRun,
    onProgress: (processed, total) => {
      if (processed % 25 === 0 || processed === total) {
        console.log(`  Progress: ${processed}/${total}`);
      }
    },
  });

  console.log("");
  console.log(`Completed signups found: ${result.total}`);
  if (dryRun) {
    console.log("Dry run complete — re-run without --dry-run to sync to Resend.");
  } else {
    console.log(`Synced to Resend: ${result.synced}`);
    console.log(`Skipped: ${result.skipped}`);
    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.length}`);
      for (const item of result.errors) {
        console.log(`  - ${item.email}: ${item.error}`);
      }
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
