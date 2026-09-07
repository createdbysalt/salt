#!/usr/bin/env tsx
/**
 * One-time backfill: write profile_playbook_settings.app_selections so
 * existing plays keep the apps they already fan out to.
 *
 * For each workspace × playbook with requirement categories:
 *   selections = connected providers in those categories − app_exclusions
 *
 * After this run, a missing/empty selections row means "no apps selected"
 * (true opt-in). New connections stay out until the owner adds them.
 *
 * Usage:
 *   pnpm playbooks:backfill-selections --dry-run
 *   pnpm playbooks:backfill-selections
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectedCategories } from "@/app/_lib/composio/category-fetcher";
import { discoverV2Playbooks } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import { listWorkspacePlaybookDefinitions } from "@/app/_features/plays/playbooks/db-definitions";

const dryRun = process.argv.includes("--dry-run");

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function main() {
  const admin = createAdminClient();
  const discovery = discoverV2Playbooks();

  const { data: workspaces, error: workspaceError } = await admin
    .from("workspaces")
    .select("id");
  if (workspaceError) {
    throw new Error(workspaceError.message);
  }

  let written = 0;
  let skipped = 0;

  for (const workspace of workspaces ?? []) {
    const workspaceId = workspace.id;
    const connected = await getConnectedCategories(workspaceId);
    const providersByCategory = new Map(
      connected.map((entry) => [entry.category, entry.providers])
    );

    const db = await listWorkspacePlaybookDefinitions(workspaceId);
    const definitions = new Map(
      discovery.allPlaybooks.map((parsed) => [
        parsed.definition.slug,
        parsed.definition,
      ])
    );
    for (const parsed of db.playbooks) {
      definitions.set(parsed.definition.slug, parsed.definition);
    }

    const { data: settingsRows } = await admin
      .from("profile_playbook_settings")
      .select("blueprint_slug, app_exclusions, app_selections")
      .eq("workspace_id", workspaceId);

    const settingsBySlug = new Map(
      (settingsRows ?? []).map((row) => [row.blueprint_slug, row])
    );

    for (const [slug, definition] of definitions) {
      const categories = [
        ...(definition.requirements?.categories?.required ?? []),
        ...(definition.requirements?.categories?.optional ?? []),
      ];
      if (categories.length === 0) {
        skipped++;
        continue;
      }

      const existing = settingsBySlug.get(slug);
      if (existing?.app_selections != null) {
        skipped++;
        continue;
      }

      const exclusions = new Set(parseStringArray(existing?.app_exclusions));
      const selections = [
        ...new Set(
          categories.flatMap(
            (category) => providersByCategory.get(category) ?? []
          )
        ),
      ].filter((provider) => !exclusions.has(provider));

      console.log(
        `${dryRun ? "[dry-run] " : ""}${workspaceId} ${slug}: ${selections.join(", ") || "(none)"}`
      );

      if (!dryRun) {
        const { error } = await admin.from("profile_playbook_settings").upsert(
          {
            workspace_id: workspaceId,
            blueprint_slug: slug,
            app_selections: selections,
          },
          { onConflict: "workspace_id,blueprint_slug" }
        );
        if (error) {
          throw new Error(`${workspaceId}/${slug}: ${error.message}`);
        }
      }
      written++;
    }
  }

  console.log(
    `${dryRun ? "Would write" : "Wrote"} ${written} row(s); skipped ${skipped}.`
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
