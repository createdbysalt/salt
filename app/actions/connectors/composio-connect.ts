"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  disconnectConnection,
  getConnectionStatus,
  initiateApiKeyConnection,
  initiateConnection,
  isComposioConfigured,
} from "@/app/_lib/composio/connections";
import type { ComposioOAuthDisplay } from "@/app/_lib/composio/oauth-state";
import {
  isComposioApiKeyProvider,
  isComposioWorkspaceProvider,
} from "@/app/_lib/composio/providers";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

/**
 * Generic Composio OAuth connect for per-app workspace connectors
 * (Drive, Docs, Sheets, Slides — Gmail and Calendar keep their dedicated
 * actions in app/actions/gmail and app/actions/calendar).
 */
export async function connectComposioProvider(
  provider: string,
  options?: { display?: ComposioOAuthDisplay },
): Promise<
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

  if (!isComposioWorkspaceProvider(provider)) {
    return { success: false, error: `Unknown connector provider: ${provider}` };
  }

  if (isComposioApiKeyProvider(provider)) {
    return {
      success: false,
      error: `${provider} connects with an API key, not OAuth`,
    };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  return initiateConnection(
    provider,
    member.workspaceId,
    member.userId,
    connectorsPageUrl(),
    { display: options?.display },
  );
}

const ApiKeyConnectSchema = z.object({
  provider: z.string().min(1),
  // Stripe secret keys are ~100 chars; bound generously without logging.
  apiKey: z.string().min(20).max(512),
});

/**
 * Connect an API-key Composio provider (Stripe). Synchronous — no OAuth
 * popup. The key goes straight to Composio and is never stored by Salt.
 */
export async function connectComposioApiKeyProvider(input: {
  provider: string;
  apiKey: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  if (!isComposioConfigured()) {
    return {
      success: false,
      error:
        "Composio is not configured. Add COMPOSIO_API_KEY to your environment.",
    };
  }

  const parsed = ApiKeyConnectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Enter a valid API key." };
  }

  const { provider, apiKey } = parsed.data;
  if (!isComposioWorkspaceProvider(provider) || !isComposioApiKeyProvider(provider)) {
    return { success: false, error: `Unknown connector provider: ${provider}` };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const result = await initiateApiKeyConnection(
    provider,
    member.workspaceId,
    member.userId,
    apiKey,
  );
  if (!result.success) {
    return result;
  }

  revalidatePath(connectorsPageUrl());
  revalidatePath("/plays");
  return { success: true };
}

/**
 * Connection status poll for the popup connect flow — the server-side
 * source of truth the main window checks while the user finishes OAuth.
 */
export async function isComposioProviderConnected(
  provider: string,
): Promise<boolean> {
  if (!isComposioWorkspaceProvider(provider)) {
    return false;
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return false;
  }

  const status = await getConnectionStatus(provider, member.workspaceId);
  return status.connected;
}

/** Generic Composio disconnect for per-app workspace connectors. */
export async function disconnectComposioProvider(
  provider: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isComposioWorkspaceProvider(provider)) {
    return { success: false, error: `Unknown connector provider: ${provider}` };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const result = await disconnectConnection(provider, member.workspaceId);
  if (!result.success) {
    return result;
  }

  revalidatePath("/plays");
  return { success: true };
}
