/**
 * DEPRECATED: v1 playbook adoption
 *
 * v2 playbooks use profile_playbook_settings for enabled/disabled state.
 * The play_templates table is legacy and no longer used for new adoptions.
 *
 * These functions are stubbed to prevent runtime errors in code that still
 * imports them. They will be removed once all callers are migrated.
 */

import "server-only";

import type { PlaybookBlueprintRow } from "./types";
import type { PlayTemplateRow } from "../types";

/**
 * @deprecated v1 adoption - use profile_playbook_settings toggle instead
 */
export async function getPlaybookBlueprint(
  _slug: string,
): Promise<PlaybookBlueprintRow | null> {
  console.warn(
    "[DEPRECATED] getPlaybookBlueprint is v1 - playbooks now use v2 discovery",
  );
  return null;
}

interface AdoptResult {
  template: PlayTemplateRow;
  created: boolean;
  missingToolkits: Array<{
    toolkit: string;
    connected: boolean;
    needsReconnect: boolean;
  }>;
}

/**
 * @deprecated v1 adoption - use profile_playbook_settings toggle instead
 */
export async function adoptPlaybookBlueprint(_input: {
  workspaceId: string;
  blueprintSlug: string;
}): Promise<AdoptResult> {
  console.warn(
    "[DEPRECATED] adoptPlaybookBlueprint is v1 - playbooks are enabled by default in v2",
  );
  throw new Error(
    "Playbook adoption is deprecated. v2 playbooks are enabled by default and use the settings toggle.",
  );
}
