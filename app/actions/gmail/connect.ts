"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getConnectionStatus,
  initiateConnection,
  isComposioConfigured,
} from "@/app/_lib/composio/connections";

/**
 * Check if Google (Gmail) integration can be connected via Composio.
 */
export async function checkGoogleOAuthConfigured() {
  return { configured: isComposioConfigured() };
}

/**
 * Start Composio OAuth for Gmail (+ Calendar scopes via Composio app config).
 */
export async function connectGoogle(workspaceId: string): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  if (!isComposioConfigured()) {
    return {
      success: false,
      error:
        "Composio is not configured. Add COMPOSIO_API_KEY to your environment.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  return initiateConnection("gmail", workspaceId, user.id, "/settings/connectors");
}

export const connectGmail = connectGoogle;

/**
 * @deprecated Custom Google OAuth callback — use /api/integrations/composio/callback
 */
export async function completeGmailConnection(_code: string, _state: string) {
  return {
    success: false as const,
    error:
      "Legacy Google OAuth is disabled. Reconnect Gmail from Settings → Integrations.",
  };
}

/**
 * Gmail connection status (Composio-backed integration row).
 */
export async function getGmailConnectionStatus(workspaceId: string) {
  const status = await getConnectionStatus("gmail", workspaceId);
  return {
    connected: status.connected,
    email: status.email,
    composioConnectionId: status.composioConnectionId,
  };
}

export async function revalidateGmailSettings() {
  revalidatePath("/settings/connectors");
}
