"use server";

/**
 * Server action: save a user-authored playbook definition.
 *
 * Groundwork for user-authored playbooks (Phase 4): the write path is live
 * and validated; the authoring UI (Ask Salt draft card → v2 definition) is
 * the deferred piece. Storage design:
 * docs/plans/2026-08-08-playbook-definitions-storage.md
 */

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { savePlaybookDefinition } from "../db-definitions";

export type SavePlaybookDefinitionActionResult =
  | { ok: true; data: { slug: string; version: string; href: string } }
  | { ok: false; message: string; errors?: string[] };

export async function savePlaybookDefinitionAction(
  definition: unknown
): Promise<SavePlaybookDefinitionActionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const result = await savePlaybookDefinition({
    workspaceId: workspace.id,
    definition,
    createdBy: context.userId,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: "This playbook definition isn't valid yet.",
      errors: result.errors,
    };
  }

  revalidatePath("/plays");
  revalidatePath(`/plays/playbooks/${result.data.slug}`);

  return {
    ok: true,
    data: {
      ...result.data,
      href: `/plays/playbooks/${result.data.slug}`,
    },
  };
}
