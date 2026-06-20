/**
 * Backfill metadata.email_sequence for completed waitlist signups.
 *
 * Sets enrolled_at from metadata.completed_at (fallback: row created_at).
 * Preserves any existing sent[] slugs.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   pnpm waitlist:sequence-backfill -- --dry-run
 *   pnpm waitlist:sequence-backfill
 *   pnpm waitlist:sequence-backfill -- --restart-as-today
 *   pnpm waitlist:sequence-backfill:op -- --restart-as-today
 */

import { backfillWaitlistEmailSequenceEnrollment } from "../app/_features/marketing/backfill-waitlist-email-sequence";

function parseFlags(argv: string[]): {
  dryRun: boolean;
  force: boolean;
  restartAsToday: boolean;
} {
  return {
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force"),
    restartAsToday: argv.includes("--restart-as-today"),
  };
}

async function main() {
  const { dryRun, force, restartAsToday } = parseFlags(process.argv.slice(2));
  const restartAsAnchor = restartAsToday ? new Date().toISOString() : undefined;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  console.log(
    restartAsToday
      ? dryRun
        ? "Dry run — would restart nurture as if everyone signed up today"
        : `Restarting nurture clock for all completed signups (anchor: ${restartAsAnchor})`
      : dryRun
        ? "Dry run — listing completed waitlist leads needing email_sequence backfill"
        : force
          ? "Backfilling email_sequence.enrolled_at (force overwrite)"
          : "Backfilling email_sequence.enrolled_at for leads missing explicit enrollment"
  );

  const result = await backfillWaitlistEmailSequenceEnrollment({
    dryRun,
    force,
    restartAsAnchor,
    onProgress: (processed, total) => {
      if (processed % 25 === 0 || processed === total) {
        console.log(`  Progress: ${processed}/${total}`);
      }
    },
  });

  console.log("");
  console.log(`Completed signups found: ${result.total}`);
  console.log(dryRun ? `Would update: ${result.updated}` : `Updated: ${result.updated}`);
  console.log(`Skipped: ${result.skipped}`);

  if (result.errors.length > 0) {
    console.log(`Errors: ${result.errors.length}`);
    for (const item of result.errors) {
      console.log(`  - ${item.email}: ${item.error}`);
    }
    process.exit(1);
  }

  if (dryRun && result.updated > 0) {
    console.log("Dry run complete — re-run without --dry-run to write metadata.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
