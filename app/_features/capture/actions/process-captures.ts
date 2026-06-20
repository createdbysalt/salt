"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  processUnlinkedCaptures,
  type ProcessCapturesResult,
} from "../services/realtime";

/**
 * Process Unlinked Captures — Server Action
 *
 * Processes capture events that haven't been linked to a Person yet.
 * Can be called manually from admin UI or after a batch Gmail sync.
 */
export async function runProcessCaptures(options?: {
  limit?: number;
  sourceType?: "gmail" | "outlook";
}): Promise<{ success: boolean; result?: ProcessCapturesResult; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    const result = await processUnlinkedCaptures(workspace.id, options);

    if (result.linked > 0 || result.peopleCreated > 0) {
      revalidatePath("/plays");
      revalidatePath("/people");
    }

    return { success: true, result };
  } catch (error) {
    console.error("Process captures failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
