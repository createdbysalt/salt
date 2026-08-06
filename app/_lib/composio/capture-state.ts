import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { adapterForToolkit } from "@/app/_features/capture/adapters/registry";
import {
  disableCaptureTriggers,
  enableCaptureTriggers,
} from "./trigger-subscriptions";

/**
 * The ONLY write path for workspace_integrations.capture_enabled
 * (capture-pipeline repair, Phase 2).
 *
 * Couples the flag with the trigger-subscription lifecycle so they can
 * never drift — the Aug 4 breakage was a bulk update setting the flag
 * without creating trigger instances:
 *
 * - ON: create the trigger instances first, then persist the flag.
 * - OFF: persist the flag first (the webhook ingress checks it, so
 *   ingestion stops immediately), then delete instances as cleanup.
 *
 * Callers own authorization: the setCaptureEnabled server action requires
 * workspace membership; connect flows run post-OAuth/post-key-validation.
 */
export async function setCaptureState(
  workspaceId: string,
  provider: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!adapterForToolkit(provider)) {
    return { ok: false, error: "This connector doesn't support capture yet." };
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, is_active")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.is_active) {
    return { ok: false, error: "Connect this account first." };
  }

  if (enabled) {
    const triggers = await enableCaptureTriggers(workspaceId, provider);
    if (!triggers.ok) {
      return {
        ok: false,
        error: triggers.error ?? "Could not start capture for this connection.",
      };
    }
  }

  const { error } = await admin
    .from("workspace_integrations")
    .update({ capture_enabled: enabled })
    .eq("id", integration.id);

  if (error) {
    return { ok: false, error: "Failed to save the capture setting." };
  }

  if (!enabled) {
    await disableCaptureTriggers(workspaceId, provider);
  }

  return { ok: true };
}
