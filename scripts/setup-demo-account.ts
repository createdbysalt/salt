/**
 * Demo Account Setup Script (CLI)
 *
 * Thin wrapper around app/_features/demo/seed-demo-workspace.ts, which is the
 * single source of truth for demo data (also used by the in-app Reset Demo
 * button). Re-run on recording/demo day to refresh all relative timestamps.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- npx tsx scripts/setup-demo-account.ts
 */

import { runDemoSeed } from "../app/_features/demo/seed-demo-workspace";

runDemoSeed().catch((error) => {
  console.error("\n❌ Setup failed:", error);
  process.exit(1);
});
