/**
 * Pull Composio trigger payload schemas for every capture-subscribed slug.
 *
 * Ground truth for the capture normalizers: each category adapter's
 * `normalize()` must parse the shapes documented here. Output feeds the
 * golden fixtures in app/_features/capture/adapters/__fixtures__/.
 *
 * The slug list comes from `connector_trigger_types` (DB, Phase 5) — rows
 * with `enabled_for_capture=true` — so the snapshot always tracks what's
 * actually subscribed instead of a hardcoded list.
 *
 * Run: op run --env-file=.env.staging.1password -- pnpm tsx scripts/pull-composio-trigger-schemas.ts
 * (needs COMPOSIO_API_KEY + SUPABASE_SERVICE_ROLE_KEY; use the env file for
 * whichever environment's subscriptions you want to snapshot)
 */

import { Composio } from "@composio/core";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

async function loadCaptureTriggerSlugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — run via op run --env-file=.env.staging.1password",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("connector_trigger_types")
    .select("trigger_slug")
    .eq("enabled_for_capture", true)
    .order("trigger_slug");
  if (error) {
    console.error(`Failed to load trigger slugs from DB: ${error.message}`);
    process.exit(1);
  }
  return (data ?? []).map((row) => row.trigger_slug as string);
}

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error(
      "COMPOSIO_API_KEY not set — run via op run --env-file=.env.staging.1password",
    );
    process.exit(1);
  }

  const slugs = await loadCaptureTriggerSlugs();
  console.log(`Pulling schemas for ${slugs.length} capture-enabled trigger slugs (from connector_trigger_types)\n`);

  const composio = new Composio({ apiKey });
  const schemas: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const slug of slugs) {
    try {
      const type = await composio.triggers.getType(slug);
      schemas[slug] = type;
      console.log(`ok    ${slug}`);
    } catch (error) {
      errors[slug] = error instanceof Error ? error.message : String(error);
      console.error(`FAIL  ${slug}: ${errors[slug]}`);
    }
  }

  const outPath = resolve(
    process.cwd(),
    "app/_features/capture/adapters/__fixtures__/composio-trigger-schemas.json",
  );
  writeFileSync(
    outPath,
    JSON.stringify(
      { pulledAt: new Date().toISOString(), schemas, errors },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${Object.keys(schemas).length} schemas (${Object.keys(errors).length} errors) to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
