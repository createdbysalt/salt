#!/usr/bin/env npx tsx
/**
 * Delete stale play_runs whose playbook slug is no longer in the catalog
 * (2026-09-08 trim — see app/_features/plays/playbooks/v2/RETIRED-PLAYBOOKS.md).
 *
 * Run:  op run --env-file=.env.staging.1password -- pnpm tsx scripts/delete-stale-play-runs.ts [email]
 *
 * DESTRUCTIVE — hard-deletes play_runs rows. FKs are safe:
 * play_run_sources / play_run_assignments / pacing_guard_hits CASCADE,
 * activity_entries / usage_events SET NULL.
 */

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] ?? "hello@createdbysalt.com";

const RETIRED_SLUGS = [
  "contract-renewal-alert",
  "payment-reconciliation",
  "email-digest",
  "email-triage",
  "create-first-playbook",
  "getting-started",
  "meeting-prep",
  "meeting-recap",
  "follow-up",
  "relationship-health",
  "upsell-opportunity",
  "blocker-watch",
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: usersPage, error: usersError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw usersError;
  const user = usersPage.users.find((u) => u.email === email);
  if (!user) throw new Error(`No auth user for ${email}`);

  const { data: memberships, error: mErr } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);
  if (mErr) throw mErr;
  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
  console.log(`Workspaces for ${email}: ${workspaceIds.join(", ")}`);

  // Match slug in either the canonical source_context or legacy trigger_evidence
  const orFilter = RETIRED_SLUGS.flatMap((s) => [
    `source_context->>playbook_slug.eq.${s}`,
    `trigger_evidence->>playbook_slug.eq.${s}`,
  ]).join(",");

  const { data: matches, error: sErr } = await supabase
    .from("play_runs")
    .select("id, state, title, created_at, source_context")
    .in("workspace_id", workspaceIds)
    .or(orFilter);
  if (sErr) throw sErr;

  console.log(`\nMatched ${matches?.length ?? 0} play_runs to delete:`);
  for (const run of matches ?? []) {
    const slug = (run.source_context as Record<string, unknown> | null)
      ?.playbook_slug;
    console.log(`- [${run.state}] slug=${slug ?? "?"} | ${run.created_at} | ${run.title}`);
  }

  if (!matches?.length) {
    console.log("\nNothing to delete.");
    return;
  }

  const ids = matches.map((r) => r.id);
  const { error: dErr, count } = await supabase
    .from("play_runs")
    .delete({ count: "exact" })
    .in("id", ids);
  if (dErr) throw dErr;

  console.log(`\nDeleted ${count ?? ids.length} play_runs rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
