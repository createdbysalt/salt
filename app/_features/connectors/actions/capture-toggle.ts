"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { setCaptureState } from "@/app/_lib/composio/capture-state";

const SetCaptureSchema = z.object({
  provider: z.string().min(1),
  enabled: z.boolean(),
});

/**
 * Per-connection capture opt-in (connector-platform Phase 3.3b).
 *
 * Auth + validation wrapper around setCaptureState — the single write path
 * that couples the capture_enabled flag with trigger-subscription lifecycle.
 * Consent moment: this is only ever flipped by an explicit user tap.
 */
export async function setCaptureEnabled(input: {
  provider: string;
  enabled: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = SetCaptureSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }
  const { provider, enabled } = parsed.data;

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const result = await setCaptureState(member.workspaceId, provider, enabled);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  revalidatePath("/sources");
  return { success: true };
}
