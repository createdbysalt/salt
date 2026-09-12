/**
 * List play_runs in the demo workspace (any state, any age).
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- npx tsx scripts/list-demo-play-runs.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", "demo-usesalt-io")
    .single();

  if (wsError || !workspace) {
    console.error("Demo workspace not found:", wsError?.message);
    process.exit(1);
  }
  console.log(`Workspace: ${workspace.name} (${workspace.id})\n`);

  const { data: runs, error } = await supabase
    .from("play_runs")
    .select("id, title, state, queue, approved_at, ran_at, created_at, updated_at")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  console.log(`play_runs: ${(runs ?? []).length}\n`);
  for (const run of runs ?? []) {
    console.log(`  ${run.id}`);
    console.log(`    title:       ${run.title}`);
    console.log(`    state:       ${run.state} (queue: ${run.queue})`);
    console.log(`    approved_at: ${run.approved_at ?? "—"}`);
    console.log(`    ran_at:      ${run.ran_at ?? "—"}`);
    console.log(`    updated_at:  ${run.updated_at}\n`);
  }
}

main();
