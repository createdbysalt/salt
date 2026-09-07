import "server-only";

/**
 * Which repo playbooks allowlist a given tool slug — the reverse index the
 * drift-disable feedback loop needs.
 *
 * When catalog-sync drift-disables a classification, the tool hard-denies at
 * the execution gate by design. Before 2026-09-06 nothing downstream learned
 * which playbooks that just broke — the user found out via a post-approval
 * failure. This index lets the sync job emit `playbook_tool_disabled` events
 * naming the affected playbooks, and lets the ops review queue show them
 * next to each disabled tool so re-review is informed, not blind.
 *
 * Source of truth is the repo registry (definition.yaml allowlists), not the
 * DB — a playbook that can't pass validation can't run anyway.
 */

import { discoverV2Playbooks } from "./schema/v2/discovery";
import type { PlaybookSection } from "./schema/v2/types";

export interface PlaybookToolUsage {
  slug: string;
  name: string;
  section: PlaybookSection;
}

/**
 * Map each requested tool slug to the playbooks whose definition allowlists
 * it. Slugs no playbook uses are absent from the map.
 */
export function findPlaybooksUsingTools(
  toolSlugs: readonly string[]
): Map<string, PlaybookToolUsage[]> {
  const wanted = new Set(toolSlugs);
  const result = new Map<string, PlaybookToolUsage[]>();
  if (wanted.size === 0) return result;

  const discovery = discoverV2Playbooks();
  for (const playbook of discovery.allPlaybooks) {
    const tools = playbook.definition.tools ?? [];
    for (const tool of tools) {
      if (!wanted.has(tool)) continue;
      const list = result.get(tool) ?? [];
      list.push({
        slug: playbook.definition.slug,
        name: playbook.definition.name,
        section: playbook.definition.section,
      });
      result.set(tool, list);
    }
  }
  return result;
}

/** Convenience single-slug form for the ops review queue. */
export function findPlaybooksUsingTool(toolSlug: string): PlaybookToolUsage[] {
  return findPlaybooksUsingTools([toolSlug]).get(toolSlug) ?? [];
}
