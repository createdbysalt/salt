import "server-only";

/**
 * Integration Queries
 *
 * Data fetching functions for workspace integrations.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type {
  IntegrationProvider,
  IntegrationStatus,
  IntegrationConfig,
} from "./types";

/**
 * Get integration status for a specific provider.
 */
export async function getIntegrationStatus(
  provider: IntegrationProvider
): Promise<IntegrationStatus> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workspace_integrations")
      .select("id, config, is_active, connected_at, last_error")
      .eq("workspace_id", workspace.id)
      .eq("provider", provider)
      .single();

    if (error || !data) {
      return { connected: false };
    }

    return {
      connected: data.is_active,
      config: data.config as IntegrationConfig,
      connectedAt: data.connected_at ? new Date(data.connected_at) : undefined,
      lastError: data.last_error || undefined,
    };
  } catch {
    return { connected: false };
  }
}

/**
 * Get all integration statuses for the current workspace.
 */
export async function getAllIntegrationStatuses(): Promise<
  Record<IntegrationProvider, IntegrationStatus>
> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workspace_integrations")
      .select("provider, config, is_active, connected_at, last_error")
      .eq("workspace_id", workspace.id)
      .eq("is_active", true);

    if (error) {
      console.error("Failed to fetch integrations:", error);
      return {
        calcom: { connected: false },
        fireflies: { connected: false },
      };
    }

    const result: Record<IntegrationProvider, IntegrationStatus> = {
      calcom: { connected: false },
      fireflies: { connected: false },
    };

    for (const integration of data || []) {
      const provider = integration.provider as IntegrationProvider;
      result[provider] = {
        connected: integration.is_active,
        config: integration.config as IntegrationConfig,
        connectedAt: integration.connected_at
          ? new Date(integration.connected_at)
          : undefined,
        lastError: integration.last_error || undefined,
      };
    }

    return result;
  } catch {
    return {
      calcom: { connected: false },
      fireflies: { connected: false },
    };
  }
}

/**
 * Get the decrypted API key for an integration.
 * Only use this on the server side for making API calls.
 */
export async function getIntegrationApiKey(
  workspaceId: string,
  provider: IntegrationProvider
): Promise<string | null> {
  const { createAdminClient } = await import("@/app/_lib/supabase/admin");
  const { decryptToken } = await import("@repo/security");

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("workspace_integrations")
    .select("api_key_encrypted")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  if (error || !data?.api_key_encrypted) {
    return null;
  }

  try {
    return decryptToken(data.api_key_encrypted);
  } catch {
    console.error(`Failed to decrypt ${provider} API key for workspace ${workspaceId}`);
    return null;
  }
}
