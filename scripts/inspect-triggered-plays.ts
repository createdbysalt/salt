import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // 1. Captures by stamped intelligence outcome
  const { data: captures, error: cErr } = await supabase
    .from("capture_events")
    .select("id, extracted_data, enriched_metadata")
    .not("extracted_data", "is", null)
    .limit(2000);
  if (cErr) {
    console.error("captures:", cErr.message);
    process.exit(1);
  }

  const outcomes: Record<string, number> = {};
  for (const c of captures ?? []) {
    const ed = c.extracted_data as Record<string, unknown> | null;
    const intel = ed?.intelligence as Record<string, unknown> | undefined;
    const outcome = (intel?.outcome as string) ?? "unstamped";
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
  }
  console.log("Capture outcomes:", outcomes);

  // Also count enriched plays_dispatched
  let withDispatched = 0;
  const dispatchedRunIds: string[] = [];
  for (const c of captures ?? []) {
    const em = c.enriched_metadata as Record<string, unknown> | null;
    const disp = em?.plays_dispatched;
    if (Array.isArray(disp) && disp.length > 0) {
      withDispatched++;
      for (const d of disp) {
        const rid = (d as Record<string, unknown>).play_run_id;
        if (typeof rid === "string") dispatchedRunIds.push(rid);
      }
    }
  }
  console.log(`Captures with plays_dispatched: ${withDispatched}, run ids: ${dispatchedRunIds.length}`);

  // 2. Findings by state
  const { data: findings, error: fErr } = await supabase
    .from("intelligence_findings")
    .select("id, state, title, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (fErr) console.error("findings:", fErr.message);
  const states: Record<string, number> = {};
  for (const f of findings ?? []) states[f.state] = (states[f.state] ?? 0) + 1;
  console.log("\nFinding states:", states);

  // 3. play_runs by state
  const { data: runs, error: rErr } = await supabase
    .from("play_runs")
    .select("id, state, created_at, source_context, title")
    .order("created_at", { ascending: false })
    .limit(500);
  if (rErr) console.error("play_runs:", rErr.message);
  const runStates: Record<string, number> = {};
  for (const r of runs ?? []) runStates[r.state] = (runStates[r.state] ?? 0) + 1;
  console.log("\nplay_runs state:", runStates, `total=${runs?.length ?? 0}`);

  // 4. Do the dispatched play_run_ids still exist and in what state?
  if (dispatchedRunIds.length > 0) {
    const unique = [...new Set(dispatchedRunIds)];
    const { data: dispRuns } = await supabase
      .from("play_runs")
      .select("id, state")
      .in("id", unique);
    const found = new Map((dispRuns ?? []).map((r) => [r.id, r.state]));
    let missing = 0;
    const stateCount: Record<string, number> = {};
    for (const id of unique) {
      const s = found.get(id);
      if (!s) missing++;
      else stateCount[s] = (stateCount[s] ?? 0) + 1;
    }
    console.log(`\nDispatched run ids: ${unique.length} unique, ${missing} missing from play_runs, states:`, stateCount);
  }

  // 5. Sample recent play_runs to see what playbook/trigger created them
  console.log("\nRecent play_runs:");
  for (const r of (runs ?? []).slice(0, 10)) {
    const sc = r.source_context as Record<string, unknown> | null;
    console.log(`  ${r.created_at.slice(0, 16)}  ${r.state}  playbook=${sc?.playbook_slug ?? "-"}  title=${String(r.title).slice(0, 60)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
