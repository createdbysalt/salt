"use server";

import type { UserPlaybookDraft } from "../user-playbook-draft";

export type SaveUserPlaybookResult =
  | { ok: true; data: { slug: string; name: string; href: string } }
  | { ok: false; message: string; errorId?: string };

/**
 * DEPRECATED: v1 user playbook drafts (PlayDefinition-shaped) are not
 * supported in v2.
 *
 * The v2 write path now exists — see `save-playbook-definition.ts`
 * (Zod-validated save into `playbook_definitions`). What remains is the
 * authoring UI: this Ask Salt draft card still produces v1-shaped drafts,
 * so it keeps failing soft until the card emits a v2 definition.
 */
export async function saveUserPlaybookAction(
  _draft: UserPlaybookDraft,
): Promise<SaveUserPlaybookResult> {
  return {
    ok: false,
    message:
      "User-created playbooks are not yet available in this version. " +
      "This feature is being rebuilt. Please check back later.",
  };
}
