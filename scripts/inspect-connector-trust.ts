#!/usr/bin/env npx tsx
/**
 * Inspect connector trust state + recent failed play runs for a workspace.
 *
 * Run: op run --env-file=.env.1password -- pnpm tsx scripts/inspect-connector-trust.ts
 *
 * Read-only. Root-causing the "Composio tool not approved" error on an
 * approved invoice-reminder send.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // 1. Recent play runs with errors
  const { data: runs, error: runsError } = await supabase
    .from("play_runs")
    .select("id, title, state, last_error, paused_for_approval, approval_context, created_at, updated_at, workspace_id")
    .order("updated_at", { ascending: false })
    .limit(10);
  if (runsError) throw runsError;
  console.log("=== recent play_runs ===");
  for (const r of runs ?? []) {
    console.log(`\n[${r.updated_at}] ${r.title}`);
    console.log(`  state=${r.state} paused=${r.paused_for_approval}`);
    console.log(`  last_error=${r.last_error}`);
    console.log(`  approval_context=${JSON.stringify(r.approval_context)}`);
    console.log(`  workspace=${r.workspace_id}`);
  }

  // 2. Workspace-global trust (the real switch — per-connector trust is retired)
  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, trust_level");
  if (wsError) throw wsError;
  console.log("\n=== workspaces ===");
  for (const w of workspaces ?? []) {
    console.log(`- ${w.id} "${w.name}" trust=${w.trust_level}`);
  }

  // 3. Connector state
  const { data: integrations, error: intError } = await supabase
    .from("workspace_integrations")
    .select("workspace_id, provider, composio_status, trust_level, config")
    .order("updated_at", { ascending: false });
  if (intError) throw intError;
  console.log("\n=== workspace_integrations ===");
  for (const i of integrations ?? []) {
    console.log(
      `- ws=${i.workspace_id} provider=${i.provider} status=${i.composio_status} trust=${i.trust_level} config=${JSON.stringify(i.config)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
