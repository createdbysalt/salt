/**
 * Manual run of the Memory Care work-synthesis capability (normally the
 * daily 4am cron via /api/cron/playbook-schedules). Re-reads each work
 * record's linked emails/documents and proposes a canonical name + summary
 * through the care decision pipeline: high-confidence renames auto-apply
 * (and land in salt_learnings), lower-confidence ones park as Watching
 * evidence in Memory → Activity.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/run-work-synthesis.ts [--workspace <id>]
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { runWorkSynthesisCapability } from "@/app/_features/memory/care/capabilities/work-synthesis";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const workspaceArg = argValue("--workspace");
  const supabase = createAdminClient();

  let workspaceIds: string[] = [];
  if (workspaceArg) {
    workspaceIds = [workspaceArg];
  } else {
    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select("id, name");
    if (error) throw error;
    workspaceIds = (workspaces ?? []).map((w) => w.id);
    console.log(
      `[work-synthesis] workspaces: ${(workspaces ?? [])
        .map((w) => `${w.name ?? "(unnamed)"} (${w.id})`)
        .join(", ")}`,
    );
  }

  for (const workspaceId of workspaceIds) {
    console.log(`\n[work-synthesis] running for workspace ${workspaceId}…`);
    const result = await runWorkSynthesisCapability({ workspaceId });
    console.log(`[work-synthesis] ${result.summary ?? result.error ?? "done"}`);
    if (result.data) console.log("[work-synthesis] data:", result.data);
  }
}

main().catch((error) => {
  console.error("[work-synthesis] fatal:", error);
  process.exit(1);
});
