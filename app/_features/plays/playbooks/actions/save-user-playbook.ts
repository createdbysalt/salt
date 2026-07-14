"use server";

import type { UserPlaybookDraft } from "../user-playbook-draft";

export type SaveUserPlaybookResult =
  | { ok: true; data: { slug: string; name: string; href: string } }
  | { ok: false; message: string; errorId?: string };

/**
 * DEPRECATED: User playbook creation is not yet supported in v2.
 *
 * v1 playbooks used database-stored blueprints and play_templates.
 * v2 playbooks are filesystem-based (definition.yaml).
 *
 * This action is retained to avoid breaking the UI during the transition.
 * User-created playbooks will be re-implemented using the v2 system.
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
