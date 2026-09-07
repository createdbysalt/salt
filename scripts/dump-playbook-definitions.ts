#!/usr/bin/env npx tsx
/**
 * Dump playbook_definitions (workspace DB playbooks)
 *
 * Run: op run --env-file=.env.1password -- pnpm tsx scripts/dump-playbook-definitions.ts
 *
 * Read-only. Used to reconcile DB-only playbooks against repo v2 packages
 * before porting them to the filesystem catalog.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: defs, error: defsError } = await supabase
    .from("playbook_definitions")
    .select("*")
    .order("created_at", { ascending: false });
  if (defsError) throw defsError;
  console.log(`=== playbook_definitions: ${defs?.length ?? 0} rows ===`);
  for (const row of defs ?? []) {
    console.log(
      `- slug=${row.slug} | name=${row.name} | workspace=${row.workspace_id} | status=${row.status} | created=${row.created_at}`,
    );
  }

  const { data: settings, error: settingsError } = await supabase
    .from("profile_playbook_settings")
    .select("*")
    .limit(5);
  if (settingsError) throw settingsError;
  console.log("\n=== profile_playbook_settings sample row keys ===");
  if (settings?.[0]) console.log(Object.keys(settings[0]).join(", "));

  writeFileSync(
    "/tmp/playbook-definitions-dump.json",
    JSON.stringify({ definitions: defs, settings }, null, 2),
  );
  console.log("\nFull dump written to /tmp/playbook-definitions-dump.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
