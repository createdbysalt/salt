"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import {
  disableCaptureTriggers,
  enableCaptureTriggers,
} from "@/app/_lib/composio/trigger-subscriptions";
import { adapterForToolkit } from "@/app/_features/capture/adapters/registry";

const SetCaptureSchema = z.object({
  provider: z.string().min(1),
  enabled: z.boolean(),
});

/**
 * Per-connection capture opt-in (connector-platform Phase 3.3b).
 *
 * ON: create the adapter's trigger instances, then persist the flag.
 * OFF: persist first (the ingress checks the flag, so ingestion stops
 * immediately), then delete instances as cleanup. Consent moment: this is
 * only ever flipped by an explicit user tap.
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

  if (!adapterForToolkit(provider)) {
    return { success: false, error: "This connector doesn't support capture yet." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, is_active")
    .eq("workspace_id", member.workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.is_active) {
    return { success: false, error: "Connect this account first." };
  }

  if (enabled) {
    const triggers = await enableCaptureTriggers(member.workspaceId, provider);
    if (!triggers.ok) {
      return {
        success: false,
        error: triggers.error ?? "Could not start capture for this connection.",
      };
    }
  }

  const { error } = await admin
    .from("workspace_integrations")
    .update({ capture_enabled: enabled })
    .eq("id", integration.id);

  if (error) {
    return { success: false, error: "Failed to save the capture setting." };
  }

  if (!enabled) {
    await disableCaptureTriggers(member.workspaceId, provider);
  }

  revalidatePath("/plays");
  return { success: true };
}
