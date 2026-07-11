import "server-only";

import type { PlaybookBlueprintView } from "../types";
import type { PlaybookBlueprintRow } from "./types";
import { discoverKeeperPlaybookDirs, discoverPlaybookDirs, readPlaybookSource } from "./discover-playbooks";
import { parsePlaybookMarkdown } from "./parse-playbook";

function parsedToRow(parsed: ReturnType<typeof parsePlaybookMarkdown>): PlaybookBlueprintRow {
  const now = new Date().toISOString();
  return {
    slug: parsed.frontmatter.slug,
    name: parsed.frontmatter.name,
    kind: parsed.frontmatter.kind,
    player_slug: parsed.frontmatter.player_slug,
    description: parsed.frontmatter.description,
    when_to_use: parsed.frontmatter.when_to_use,
    trigger: parsed.frontmatter.trigger,
    procedure_md: parsed.procedure_md,
    definition: parsed.definition,
    fill_rules: parsed.fill_rules,
    required_actions: parsed.required_actions,
    required_toolkits: parsed.frontmatter.required_toolkits,
    value_model: parsed.frontmatter.value,
    version: 1,
    status: "active",
    created_at: now,
    updated_at: now,
    workspace_id: null,
    origin: "salt",
  };
}

export function loadAuthoredPlaybookBlueprintRows(): PlaybookBlueprintRow[] {
  const allDirs = [...discoverKeeperPlaybookDirs(), ...discoverPlaybookDirs()];
  return allDirs
    .map(({ playbookPath }) => {
      try {
        return parsedToRow(parsePlaybookMarkdown(readPlaybookSource(playbookPath), playbookPath));
      } catch {
        return null;
      }
    })
    .filter((row): row is PlaybookBlueprintRow => row != null)
    .sort((a, b) => a.player_slug.localeCompare(b.player_slug) || a.name.localeCompare(b.name));
}

export function loadAuthoredPlaybookBlueprintViews(
  mapRow: (row: PlaybookBlueprintRow) => PlaybookBlueprintView,
): PlaybookBlueprintView[] {
  return loadAuthoredPlaybookBlueprintRows().map(mapRow);
}

export function getAuthoredPlaybookBlueprintRow(slug: string): PlaybookBlueprintRow | null {
  return loadAuthoredPlaybookBlueprintRows().find((row) => row.slug === slug) ?? null;
}
