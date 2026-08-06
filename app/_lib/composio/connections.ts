import "server-only";

import type { ConnectedAccountRetrieveResponse } from "@composio/core";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { createClient } from "@/app/_lib/supabase/server";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import { getComposioClient } from "./client";
import {
  decodeComposioOAuthState,
  encodeComposioOAuthState,
  type ComposioOAuthDisplay,
} from "./oauth-state";
import {
  getConnector,
  getAuthConfigId,
  getApiKeyFieldName,
  isRegisteredProvider,
} from "./unified-connector-registry";
import { assertWorkspaceMembership } from "./workspace-auth";
import { setCaptureState } from "./capture-state";

export type ComposioConnectionStatus = "connected" | "pending" | "expired" | "error";

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
  provider: string,
  workspaceId: string,
  userId: string,
  returnUrl = connectorsPageUrl(),
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

  const connector = getConnector(provider);
  const authConfigId = getAuthConfigId(provider);
  if (!connector || !authConfigId) {
    return {
      success: false,
      error: "This connector isn't available yet.",
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
      display: options?.display,
    });
    const callbackUrl = buildComposioCallbackUrl(state);
    const toolkit = provider; // toolkit slug = provider key

    const composio = getComposioClient();
    const session = await composio.create(workspaceId, {
      toolkits: [toolkit],
      authConfigs: { [toolkit]: authConfigId },
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

/**
 * Connect an API-key provider (e.g. Stripe). Completes synchronously —
 * no OAuth redirect or callback round-trip. The key is forwarded to
 * Composio (which stores it) and is never persisted or logged by Salt.
 *
 * `extraFields` are additional Composio initiation fields (e.g. Shopify's
 * store subdomain). Callers must allowlist field names against the
 * connector's catalog `apiKeyForm` before passing them here.
 */
export async function initiateApiKeyConnection(
  provider: string,
  workspaceId: string,
  userId: string,
  apiKey: string,
  extraFields?: Record<string, string>,
): Promise<
  | { success: true; status: ComposioConnectionStatus }
  | { success: false; error: string }
> {
  if (!isComposioConfigured()) {
    return {
      success: false,
      error:
        "Composio is not configured. Add COMPOSIO_API_KEY to your environment.",
    };
  }

  const connector = getConnector(provider);
  const authConfigId = getAuthConfigId(provider);
  if (!connector || !authConfigId || connector.authMethod !== "api_key") {
    return {
      success: false,
      error: "This connector isn't available yet.",
    };
  }

  const membership = await assertWorkspaceMembership(userId, workspaceId);
  if (!membership.ok) {
    return { success: false, error: membership.error };
  }

  try {
    const composio = getComposioClient();
    // Composio requires the toolkit's exact wire field name
    // (generic_api_key / bearer_token) — AuthScheme.APIKey's `api_key` only
    // maps for toolkits with a legacy template alias.
    const apiKeyFieldName = getApiKeyFieldName(provider) ?? "generic_api_key";
    const connectionRequest = await composio.connectedAccounts.initiate(
      workspaceId,
      authConfigId,
      {
        config: {
          authScheme: "API_KEY",
          val: {
            status: "ACTIVE",
            ...extraFields,
            [apiKeyFieldName]: apiKey,
          },
        },
        allowMultiple: true,
      },
    );

    const connection = await composio.connectedAccounts.get(
      connectionRequest.id,
    );
    const composioStatus = mapComposioStatus(connection.status);

    const admin = createAdminClient();
    const { error: upsertError } = await admin
      .from("workspace_integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          provider,
          composio_connection_id: connectionRequest.id,
          composio_status: composioStatus,
          is_active: composioStatus === "connected",
          connected_by: userId,
          connected_at: new Date().toISOString(),
          last_error:
            composioStatus === "connected" ? null : "Connection not active",
        },
        { onConflict: "workspace_id,provider" },
      );

    if (upsertError) {
      console.error("[composio] failed to persist integration:", upsertError);
      return { success: false, error: "Failed to store integration" };
    }

    if (composioStatus !== "connected") {
      return {
        success: false,
        error: "The API key was not accepted. Check the key and try again.",
      };
    }

    // Auto-enable capture, mirroring the OAuth callback path (the API-key
    // flow previously skipped this, leaving capture_enabled connections
    // with no trigger subscriptions). Non-fatal: the connection succeeded.
    const { adapterForToolkit } = await import(
      "@/app/_features/capture/adapters/registry"
    );
    if (adapterForToolkit(provider)) {
      const captureResult = await setCaptureState(workspaceId, provider, true);
      if (!captureResult.ok) {
        console.warn(
          "[composio] Failed to enable capture for API-key provider:",
          provider,
          captureResult.error,
        );
      }
    }

    return { success: true, status: composioStatus };
  } catch (error) {
    // Log only the message — Composio validation errors can echo request
    // payloads (the API key) back in their details.
    console.error(
      "[composio] initiateApiKeyConnection failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      success: false,
      error: "Failed to connect. Check the API key and try again.",
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
      provider: string;
      display?: ComposioOAuthDisplay;
    }
  | { success: false; error: string }
> {
  const stateData = decodeComposioOAuthState(state);
  if (!stateData || !isRegisteredProvider(stateData.provider)) {
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

    // Run first scan for Gmail/Calendar connections
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

    // Auto-enable capture for connectors that support it (single write
    // path: setCaptureState couples the flag with trigger subscriptions).
    if (composioStatus === "connected") {
      const { adapterForToolkit } = await import(
        "@/app/_features/capture/adapters/registry"
      );
      if (adapterForToolkit(stateData.provider)) {
        console.log(`[composio] Auto-enabling capture for ${stateData.provider}`);
        const captureResult = await setCaptureState(
          stateData.workspaceId,
          stateData.provider,
          true,
        );
        if (captureResult.ok) {
          console.log(`[composio] Capture enabled for ${stateData.provider}`);
        } else {
          console.warn(
            "[composio] Failed to enable capture for provider:",
            stateData.provider,
            captureResult.error,
          );
        }
      }
    }

    // Run capture bootstrap when connectors are connected
    console.log(`[composio] Callback complete. Status: ${composioStatus}, Provider: ${stateData.provider}`);
    if (composioStatus === "connected") {
      if (stateData.provider === "gmail") {
        console.log(`[composio] Triggering Gmail bootstrap for workspace ${stateData.workspaceId}`);
        const { runGmailBootstrap } = await import(
          "@/app/_features/capture/services/gmail-backfill"
        );
        void runGmailBootstrap(stateData.workspaceId).catch((bootstrapError) => {
          console.error("[composio] gmail capture bootstrap failed:", bootstrapError);
        });
      }

      if (stateData.provider === "googlecalendar") {
        const { runCalendarBootstrap } = await import(
          "@/app/_features/capture/services/connector-backfills"
        );
        void runCalendarBootstrap(stateData.workspaceId).catch((bootstrapError) => {
          console.error("[composio] calendar capture bootstrap failed:", bootstrapError);
        });
      }

      if (stateData.provider === "googledrive") {
        const { runDriveBootstrap } = await import(
          "@/app/_features/capture/services/connector-backfills"
        );
        void runDriveBootstrap(stateData.workspaceId).catch((bootstrapError) => {
          console.error("[composio] drive capture bootstrap failed:", bootstrapError);
        });
      }

      if (stateData.provider === "stripe") {
        const { runStripeBootstrap } = await import(
          "@/app/_features/capture/services/connector-backfills"
        );
        void runStripeBootstrap(stateData.workspaceId).catch((bootstrapError) => {
          console.error("[composio] stripe capture bootstrap failed:", bootstrapError);
        });
      }

      if (stateData.provider === "cal") {
        const { runCalBootstrap } = await import(
          "@/app/_features/capture/services/connector-backfills"
        );
        void runCalBootstrap(stateData.workspaceId).catch((bootstrapError) => {
          console.error("[composio] cal capture bootstrap failed:", bootstrapError);
        });
      }
    }

    return {
      success: true,
      returnUrl: stateData.returnUrl,
      email,
      provider: stateData.provider,
      display: stateData.display,
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

export interface ConnectionStatusResult {
  connected: boolean;
  email: string | null;
  integrationId: string | null;
  composioConnectionId: string | null;
  composioStatus: ComposioConnectionStatus | null;
}

interface ConnectionStatusRow {
  id: string;
  composio_connection_id: string | null;
  composio_status: string | null;
  config: unknown;
  is_active: boolean | null;
}

function toConnectionStatus(
  integration: ConnectionStatusRow | null,
): ConnectionStatusResult {
  if (!integration?.is_active || !integration.composio_connection_id) {
    return {
      connected: false,
      email: null,
      integrationId: null,
      composioConnectionId: null,
      composioStatus: null,
    };
  }

  const config = integration.config as { email?: string } | null;

  return {
    connected: integration.composio_status === "connected",
    email: config?.email ?? null,
    integrationId: integration.id,
    composioConnectionId: integration.composio_connection_id,
    composioStatus: (integration.composio_status as ComposioConnectionStatus) ?? null,
  };
}

export async function getConnectionStatus(
  provider: string,
  workspaceId: string,
): Promise<ConnectionStatusResult> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("workspace_integrations")
    .select("id, composio_connection_id, composio_status, config, is_active")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  return toConnectionStatus(integration);
}

/**
 * Connection status for system contexts (crons, webhooks, background jobs)
 * where there is no user session. getConnectionStatus uses the
 * session-scoped client, so under RLS it returns "not connected" for every
 * workspace when called from a cron — which silently broke the
 * capture-reconciliation sweep (capture-pipeline repair, Phase 3).
 *
 * Callers must already be workspace-scoped (workspaceId comes from a
 * trusted system iteration, never user input).
 */
export async function getConnectionStatusAdmin(
  provider: string,
  workspaceId: string,
): Promise<ConnectionStatusResult> {
  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, composio_connection_id, composio_status, config, is_active")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  return toConnectionStatus(integration as ConnectionStatusRow | null);
}

/**
 * Deep health check: queries Composio for live connection status and compares
 * against our stored state. Logs diagnostics and optionally syncs status back.
 */
export async function checkConnectionHealth(
  provider: string,
  workspaceId: string,
  options?: { syncStatus?: boolean },
): Promise<{
  healthy: boolean;
  localStatus: ComposioConnectionStatus | null;
  remoteStatus: ComposioConnectionStatus | null;
  composioConnectionId: string | null;
  diagnostics: {
    createdAt?: string;
    updatedAt?: string;
    lastUsedAt?: string;
    errorMessage?: string;
    rawStatus?: string;
    tokenExpiresAt?: string;
  };
}> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("workspace_integrations")
    .select("id, composio_connection_id, composio_status, config, is_active, connected_at, last_error")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.composio_connection_id) {
    console.log(`[composio-health] ${provider}: no connection found in DB`);
    return {
      healthy: false,
      localStatus: null,
      remoteStatus: null,
      composioConnectionId: null,
      diagnostics: {},
    };
  }

  const localStatus = integration.composio_status as ComposioConnectionStatus | null;
  let remoteStatus: ComposioConnectionStatus | null = null;
  const diagnostics: {
    createdAt?: string;
    updatedAt?: string;
    lastUsedAt?: string;
    errorMessage?: string;
    rawStatus?: string;
    tokenExpiresAt?: string;
  } = {};

  try {
    const connection = await getComposioClient().connectedAccounts.get(
      integration.composio_connection_id,
    );

    diagnostics.rawStatus = connection.status;
    diagnostics.createdAt = connection.createdAt;
    diagnostics.updatedAt = connection.updatedAt;

    // Extract token expiry if available
    const connectionData = connection as unknown as Record<string, unknown>;
    if (connectionData.tokenData && typeof connectionData.tokenData === "object") {
      const tokenData = connectionData.tokenData as Record<string, unknown>;
      if (tokenData.expiresAt) {
        diagnostics.tokenExpiresAt = String(tokenData.expiresAt);
      }
    }

    remoteStatus = mapComposioStatus(connection.status);

    console.log(`[composio-health] ${provider}:`, {
      connectionId: integration.composio_connection_id,
      localStatus,
      remoteStatus,
      rawStatus: connection.status,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      tokenExpiresAt: diagnostics.tokenExpiresAt,
      connectedAt: integration.connected_at,
      isActive: integration.is_active,
    });

    // Detect status drift
    if (localStatus !== remoteStatus) {
      console.warn(`[composio-health] ${provider}: STATUS DRIFT detected`, {
        local: localStatus,
        remote: remoteStatus,
        connectionId: integration.composio_connection_id,
      });

      // Optionally sync the status back to our DB
      if (options?.syncStatus) {
        const admin = createAdminClient();
        await admin
          .from("workspace_integrations")
          .update({
            composio_status: remoteStatus,
            is_active: remoteStatus === "connected",
            last_error: remoteStatus === "expired" ? "Connection expired - re-authenticate" : null,
          })
          .eq("id", integration.id);
        console.log(`[composio-health] ${provider}: synced status to ${remoteStatus}`);
      }
    }

    return {
      healthy: remoteStatus === "connected",
      localStatus,
      remoteStatus,
      composioConnectionId: integration.composio_connection_id,
      diagnostics,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    diagnostics.errorMessage = errorMessage;

    console.error(`[composio-health] ${provider}: failed to fetch remote status`, {
      connectionId: integration.composio_connection_id,
      error: errorMessage,
      localStatus,
    });

    return {
      healthy: false,
      localStatus,
      remoteStatus: null,
      composioConnectionId: integration.composio_connection_id,
      diagnostics,
    };
  }
}

export async function disconnectConnection(
  provider: string,
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
