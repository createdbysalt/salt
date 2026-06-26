"use server";

import { revalidatePath } from "next/cache";
import {
  disconnectConnection,
  getConnectionStatus,
  initiateConnection,
  isComposioConfigured,
} from "@/app/_lib/composio/connections";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

/**
 * Start Composio OAuth for Google Calendar only. Gmail is a separate per-app
 * connector — see app/_features/connectors/actions/gmail/connect.ts.
 */
export async function connectGoogleCalendar(options?: {
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
    "googlecalendar",
    member.workspaceId,
    member.userId,
    connectorsPageUrl(),
    { display: options?.display },
  );
}

/**
 * Disconnect Google Calendar (Composio) for the authenticated user's workspace.
 */
export async function disconnectGoogleCalendar() {
  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false as const, error: member.error };
  }

  const result = await disconnectConnection("googlecalendar", member.workspaceId);

  if (!result.success) {
    return result;
  }

  revalidatePath("/plays");
  return { success: true as const };
}

/**
 * Google Calendar connection status (Composio-backed integration row).
 */
export async function getGoogleCalendarConnectionStatus(workspaceId: string) {
  const status = await getConnectionStatus("googlecalendar", workspaceId);
  return {
    connected: status.connected,
    email: status.email,
    composioConnectionId: status.composioConnectionId,
  };
}
