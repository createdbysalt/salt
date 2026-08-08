"use server";

import { disconnectConnection } from "@/app/_lib/composio/connections";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { revalidatePath } from "next/cache";

/**
 * Disconnect Gmail (Composio) for the authenticated user's workspace.
 */
export async function disconnectGmail() {
  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false as const, error: member.error };
  }

  const result = await disconnectConnection("gmail", member.workspaceId);

  if (!result.success) {
    return result;
  }

  revalidatePath("/sources");
  return { success: true as const };
}
