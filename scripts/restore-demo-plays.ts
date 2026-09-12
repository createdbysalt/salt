/**
 * Restore approved demo plays back to the queue.
 *
 * Lists play_runs in the demo workspace that left the queue (approved/ran)
 * in the last 24 hours. With --apply, flips them back to state "queued"
 * and clears approved_at / ran_at so the cards reappear in Needs You.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- npx tsx scripts/restore-demo-plays.ts
 *   op run --env-file=.env.staging.1password -- npx tsx scripts/restore-demo-plays.ts --apply
 *   op run --env-file=.env.staging.1password -- npx tsx scripts/restore-demo-plays.ts --apply --id=<uuid> --id=<uuid>
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

const APPLY = process.argv.includes("--apply");
const idArgs = process.argv
  .filter((a) => a.startsWith("--id="))
  .map((a) => a.slice("--id=".length));

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

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("play_runs")
    .select("id, title, state, queue, approved_at, ran_at, updated_at")
    .eq("workspace_id", workspace.id)
    .in("state", ["approved", "ran"])
    .order("updated_at", { ascending: false });

  if (idArgs.length > 0) {
    // Explicit IDs: skip the 24h window.
    query = query.in("id", idArgs);
  } else {
    query = query.gte("updated_at", since);
  }

  const { data: runs, error } = await query;
  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  if (!runs || runs.length === 0) {
    console.log("No approved/ran plays in the last 24h. Nothing to restore.");
    return;
  }

  console.log(`Found ${runs.length} play(s) that left the queue:\n`);
  for (const run of runs) {
    console.log(`  ${run.id}`);
    console.log(`    title:      ${run.title}`);
    console.log(`    state:      ${run.state} (queue: ${run.queue})`);
    console.log(`    approved_at: ${run.approved_at ?? "—"}`);
    console.log(`    ran_at:      ${run.ran_at ?? "—"}`);
    console.log(`    updated_at:  ${run.updated_at}\n`);
  }

  if (!APPLY) {
    console.log("Dry run. Re-run with --apply to restore these to the queue.");
    return;
  }

  const ids = runs.map((r) => r.id);
  const { error: updateError } = await supabase
    .from("play_runs")
    .update({ state: "queued", approved_at: null, ran_at: null, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    console.error("Restore failed:", updateError.message);
    process.exit(1);
  }

  console.log(`✓ Restored ${ids.length} play(s) to state "queued".`);
}

main();
