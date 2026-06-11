import "server-only";

import type { ConnectedAccountRetrieveResponse } from "@composio/core";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { createClient } from "@/app/_lib/supabase/server";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import { getComposioClient } from "./client";
import {
  decodeComposioOAuthState,
  encodeComposioOAuthState,
} from "./oauth-state";
import {
  isComposioWorkspaceProvider,
  toComposioAppName,
  type ComposioWorkspaceProvider,
} from "./providers";
import { assertWorkspaceMembership } from "./workspace-auth";

export type ComposioConnectionStatus = "connected" | "pending" | "expired" | "error";

/** @deprecated Use ComposioOAuthStatePayload from oauth-state.ts */
export interface ComposioOAuthState {
  userId: string;
  workspaceId: string;
  studioId?: string;
  provider: ComposioWorkspaceProvider;
  returnUrl: string;
}

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function buildComposioCallbackUrl(state: string): string {
  const base = getAppBaseUrl();
  return `${base}/api/integrations/composio/callback?state=${encodeURIComponent(state)}`;
}

/** @deprecated Use encodeComposioOAuthState */
export function encodeComposioState(state: ComposioOAuthState): string {
  return encodeComposioOAuthState({
    userId: state.userId,
    workspaceId: state.workspaceId ?? state.studioId ?? "",
    provider: state.provider,
    returnUrl: state.returnUrl,
  });
}

/** @deprecated Use decodeComposioOAuthState */
export function decodeComposioState(state: string): ComposioOAuthState | null {
  const decoded = decodeComposioOAuthState(state);
  if (!decoded) {
    return null;
  }

  return {
    userId: decoded.userId,
    workspaceId: decoded.workspaceId,
    provider: decoded.provider,
    returnUrl: decoded.returnUrl,
  };
}

function mapComposioStatus(
  status: string | undefined,
): ComposioConnectionStatus {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "connected";
    case "INITIATED":
    case "INITIALIZING":
    case "PENDING":
      return "pending";
    case "EXPIRED":
      return "expired";
    default:
      return "error";
  }
}

function extractConnectionEmail(
  connection: ConnectedAccountRetrieveResponse,
): string | undefined {
  const candidates: Array<Record<string, unknown> | undefined> = [
    connection.data,
    connection.params,
    connection.state as Record<string, unknown> | undefined,
  ];

  for (const candidate of candidates) {
    const email = candidate?.email;
    if (typeof email === "string" && email.length > 0) {
      return email;
    }
  }

  return undefined;
}

/**
 * Composio entity ID = workspace id.
 */
export async function initiateConnection(
  provider: ComposioWorkspaceProvider,
  workspaceId: string,
  userId: string,
  returnUrl = connectorsPageUrl(),
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

  const membership = await assertWorkspaceMembership(userId, workspaceId);
  if (!membership.ok) {
    return { success: false, error: membership.error };
  }

  try {
    const state = encodeComposioOAuthState({
      userId,
      workspaceId,
      provider,
      returnUrl,
    });
    const callbackUrl = buildComposioCallbackUrl(state);
    const toolkit = toComposioAppName(provider);

    const composio = getComposioClient();
    const session = await composio.create(workspaceId, {
      toolkits: [toolkit],
      manageConnections: {
        enable: true,
        callbackUrl,
      },
    });

    const connectionRequest = await session.authorize(toolkit, {
      callbackUrl,
    });

    if (!connectionRequest.redirectUrl) {
      return {
        success: false,
        error: "Composio did not return an authorization URL",
      };
    }

    const admin = createAdminClient();
    await admin.from("workspace_integrations").upsert(
      {
        workspace_id: workspaceId,
        provider,
        composio_connection_id: connectionRequest.id,
        composio_status: mapComposioStatus(connectionRequest.status),
        is_active: false,
        connected_by: userId,
        last_error: null,
      },
      { onConflict: "workspace_id,provider" },
    );

    return { success: true, url: connectionRequest.redirectUrl };
  } catch (error) {
    console.error("[composio] initiateConnection failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to start Composio connection",
    };
  }
}

export async function handleConnectionCallback(
  connectedAccountId: string,
  state: string,
): Promise<
  | {
      success: true;
      returnUrl: string;
      email?: string;
      provider: ComposioWorkspaceProvider;
    }
  | { success: false; error: string }
> {
  const stateData = decodeComposioOAuthState(state);
  if (!stateData || !isComposioWorkspaceProvider(stateData.provider)) {
    return { success: false, error: "Invalid or expired state parameter" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== stateData.userId) {
    return { success: false, error: "User mismatch" };
  }

  const membership = await assertWorkspaceMembership(
    user.id,
    stateData.workspaceId,
  );
  if (!membership.ok) {
    return { success: false, error: membership.error };
  }

  try {
    const connection = await getComposioClient().connectedAccounts.get(
      connectedAccountId,
    );

    const composioStatus = mapComposioStatus(connection.status);
    const email = extractConnectionEmail(connection);

    const admin = createAdminClient();
    const { error: upsertError } = await admin.from("workspace_integrations").upsert(
      {
        workspace_id: stateData.workspaceId,
        provider: stateData.provider,
        composio_connection_id: connectedAccountId,
        composio_status: composioStatus,
        is_active: composioStatus === "connected",
        connected_by: stateData.userId,
        connected_at: new Date().toISOString(),
        last_error: composioStatus === "error" ? "Connection not active" : null,
        config: email ? { email } : {},
      },
      { onConflict: "workspace_id,provider" },
    );

    if (upsertError) {
      console.error("[composio] failed to persist integration:", upsertError);
      return { success: false, error: "Failed to store integration" };
    }

    if (
      composioStatus === "connected" &&
      (stateData.provider === "gmail" || stateData.provider === "googlecalendar")
    ) {
      const { runFirstScanForWorkspace } = await import(
        "@/app/_features/plays/services/first-scan"
      );
      void runFirstScanForWorkspace(stateData.workspaceId).catch((scanError) => {
        console.error("[composio] first scan failed:", scanError);
      });
    }

    return {
      success: true,
      returnUrl: stateData.returnUrl,
      email,
      provider: stateData.provider,
    };
  } catch (error) {
    console.error("[composio] handleConnectionCallback failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to complete connection",
    };
  }
}

export async function getConnectionStatus(
  provider: ComposioWorkspaceProvider,
  workspaceId: string,
): Promise<{
  connected: boolean;
  email: string | null;
  composioConnectionId: string | null;
  composioStatus: ComposioConnectionStatus | null;
}> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("workspace_integrations")
    .select("composio_connection_id, composio_status, config, is_active")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.is_active || !integration.composio_connection_id) {
    return {
      connected: false,
      email: null,
      composioConnectionId: null,
      composioStatus: null,
    };
  }

  const config = integration.config as { email?: string } | null;

  return {
    connected: integration.composio_status === "connected",
    email: config?.email ?? null,
    composioConnectionId: integration.composio_connection_id,
    composioStatus: (integration.composio_status as ComposioConnectionStatus) ?? null,
  };
}

export async function disconnectConnection(
  provider: ComposioWorkspaceProvider,
  workspaceId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const membership = await assertWorkspaceMembership(user.id, workspaceId);
  if (!membership.ok) {
    return { success: false, error: membership.error };
  }

  const { data: integration } = await supabase
    .from("workspace_integrations")
    .select("composio_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (integration?.composio_connection_id && isComposioConfigured()) {
    try {
      await getComposioClient().connectedAccounts.delete(
        integration.composio_connection_id,
      );
    } catch (error) {
      console.warn("[composio] remote disconnect failed:", error);
    }
  }

  const { error } = await supabase
    .from("workspace_integrations")
    .update({
      is_active: false,
      composio_status: "error",
      composio_connection_id: null,
      last_error: null,
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);

  if (error) {
    return { success: false, error: "Failed to disconnect integration" };
  }

  return { success: true };
}
