"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getConnectionStatus,
  initiateConnection,
  isComposioConfigured,
} from "@/app/_lib/composio/connections";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

/**
 * Check if Gmail integration can be connected via Composio.
 */
export async function checkGoogleOAuthConfigured() {
  return { configured: isComposioConfigured() };
}

/**
 * Start Composio OAuth for Gmail only. Google Calendar is a separate per-app
 * connector — see app/_features/connectors/actions/calendar/connect.ts.
 */
export async function connectGoogle(options?: {
  display?: "popup" | "page";
}): Promise<
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

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  return initiateConnection(
    "gmail",
    member.workspaceId,
    member.userId,
    connectorsPageUrl(),
    { display: options?.display },
  );
}

export const connectGmail = connectGoogle;

/**
 * @deprecated Custom Google OAuth callback — use /api/integrations/composio/callback
 */
export async function completeGmailConnection(_code: string, _state: string) {
  return {
    success: false as const,
    error:
      "Legacy Google OAuth is disabled. Reconnect Gmail from Settings → Connectors.",
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
  revalidatePath("/plays");
}
