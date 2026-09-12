#!/usr/bin/env npx tsx
/**
 * Manually run the signal scan for one workspace (default: Salt Studio staging).
 * Verifies the overdue-invoice → invoice-reminder dispatch path end to end
 * after the GMAIL_SEND_EMAIL classification re-approval (2026-09-06).
 *
 * Run: op run --env-file=.env.staging.1password -- pnpm tsx scripts/run-signal-scan-workspace.ts [workspaceId] [--dry]
 */

import { runSignalScan } from "@/app/_features/plays/services/signal-scanner";

const workspaceId =
  process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : "dbebf757-f66c-4af8-8071-776e0f73a5ef";
const dryRun = process.argv.includes("--dry");

async function main() {
  console.log(
    `Running signal scan for workspace ${workspaceId}${dryRun ? " (dry run)" : ""}…`,
  );
  const result = await runSignalScan(workspaceId, { dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
