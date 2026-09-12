/**
 * Inspect work record names + recent work rename learnings (post-synthesis
 * verification for scripts/run-work-synthesis.ts).
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/inspect-work-names.ts
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: works, error } = await supabase
    .from("work")
    .select("id, workspace_id, name, created_at, person_id, organization_id, service_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const personIds = [...new Set((works ?? []).map((w) => w.person_id).filter(Boolean))] as string[];
  const orgIds = [...new Set((works ?? []).map((w) => w.organization_id).filter(Boolean))] as string[];
  const serviceIds = [...new Set((works ?? []).map((w) => w.service_id).filter(Boolean))] as string[];
  const [people, orgs, services] = await Promise.all([
    personIds.length ? supabase.from("people").select("id, name").in("id", personIds) : { data: [] },
    orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : { data: [] },
    serviceIds.length ? supabase.from("workspace_services").select("id, name").in("id", serviceIds) : { data: [] },
  ]);
  const nameOf = (rows: Array<{ id: string; name: string | null }> | null, id: string | null) =>
    id ? (rows ?? []).find((r) => r.id === id)?.name ?? "?" : "—";

  console.log("--- work records ---");
  for (const work of works ?? []) {
    console.log(
      `${work.workspace_id.slice(0, 8)} | ${work.name} | person: ${nameOf(people.data, work.person_id)} | org: ${nameOf(orgs.data, work.organization_id)} | service: ${nameOf(services.data, work.service_id)}`,
    );
  }

  const { data: learnings, error: learningsError } = await supabase
    .from("salt_learnings")
    .select("summary, field_path, previous_value, new_value, created_at")
    .eq("entity_type", "work")
    .order("created_at", { ascending: false })
    .limit(10);
  if (learningsError) throw learningsError;

  console.log("--- recent work learnings ---");
  for (const learning of learnings ?? []) {
    console.log(
      `${learning.created_at?.slice(0, 16)} | ${learning.field_path} | ${JSON.stringify(learning.previous_value)} -> ${JSON.stringify(learning.new_value)}`,
    );
  }
}

main().catch((error) => {
  console.error("[inspect] fatal:", error);
  process.exit(1);
});
