"use server";

import { disconnectConnection } from "@/app/_lib/composio/connections";
import { revalidatePath } from "next/cache";

/**
 * Disconnect Gmail (Composio) for a workspace.
 */
export async function disconnectGmail(workspaceId: string) {
  const result = await disconnectConnection("gmail", workspaceId);

  if (!result.success) {
    return result;
  }

  revalidatePath("/settings/integrations");
  return { success: true as const };
}
