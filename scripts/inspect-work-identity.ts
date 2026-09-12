/**
 * One-off inspect: people + person_emails + person→org links for a
 * workspace, to verify identity resolution inputs for work-synthesis.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/inspect-work-identity.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: inspect-work-identity.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();

  const { data: people, error } = await supabase
    .from("people")
    .select("id, name, email")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  if (error) throw error;

  console.log("--- people ---");
  for (const person of people ?? []) {
    console.log(`${person.id.slice(0, 8)} | ${person.name} | ${person.email ?? "—"}`);
  }

  const { data: emails, error: emailsError } = await supabase
    .from("person_emails")
    .select("person_id, email")
    .eq("workspace_id", workspaceId);
  if (emailsError) throw emailsError;

  console.log("--- person_emails ---");
  for (const row of emails ?? []) {
    const person = (people ?? []).find((p) => p.id === row.person_id);
    console.log(`${person?.name ?? row.person_id.slice(0, 8)} | ${row.email}`);
  }

  const { data: links, error: linksError } = await supabase
    .from("entity_links")
    .select("source_id, target_id")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "person")
    .eq("target_type", "org");
  if (linksError) throw linksError;

  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  if (orgsError) throw orgsError;

  console.log("--- person → org links ---");
  for (const link of links ?? []) {
    const person = (people ?? []).find((p) => p.id === link.source_id);
    const org = (orgs ?? []).find((o) => o.id === link.target_id);
    console.log(`${person?.name ?? "?"} → ${org?.name ?? "?"}`);
  }

  console.log("--- organizations ---");
  for (const org of orgs ?? []) {
    console.log(`${org.id.slice(0, 8)} | ${org.name}`);
  }

  const { data: services, error: servicesError } = await supabase
    .from("workspace_services")
    .select("id, name, is_active")
    .eq("workspace_id", workspaceId);
  if (servicesError) throw servicesError;

  console.log("--- workspace_services ---");
  for (const service of services ?? []) {
    console.log(`${service.id.slice(0, 8)} | ${service.name} | active: ${service.is_active}`);
  }
}

main().catch((error) => {
  console.error("[inspect] fatal:", error);
  process.exit(1);
});
