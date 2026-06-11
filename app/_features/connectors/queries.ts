import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import {
  getComposioProviderForToolSlug,
  getGoogleToolPreferenceProviders,
} from "./connector-capabilities";
import { getDisabledToolsFromConfig } from "./connector-config";
import type { ConnectorsPageData, ConnectorRuntimeStatus } from "./types";
import type { ConnectorCatalogId } from "./types";

async function getStripeStatus(): Promise<ConnectorRuntimeStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { connected: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_status, stripe_connect_charges_enabled")
    .eq("id", user.id)
    .single();

  const connected = profile?.stripe_connect_status === "active";

  return {
    connected,
    label: connected ? profile?.stripe_connect_account_id ?? "Connected" : undefined,
  };
}

async function loadGoogleDisabledTools(
  workspaceId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("workspace_integrations")
    .select("provider, config")
    .eq("workspace_id", workspaceId)
    .in("provider", [...getGoogleToolPreferenceProviders()]);

  const disabled = new Set<string>();
  for (const row of rows ?? []) {
    for (const slug of getDisabledToolsFromConfig(
      row.config as Record<string, unknown> | null,
    )) {
      disabled.add(slug);
    }
  }
  return [...disabled];
}

/**
 * All disabled Composio tool slugs for a workspace. Currently covers the
 * Google-family providers, which are the only Ask Salt toolkits; extend per
 * provider as new connectors gain tool toggles.
 */
export async function getWorkspaceDisabledTools(
  workspaceId: string,
): Promise<string[]> {
  return loadGoogleDisabledTools(workspaceId);
}

/**
 * Load disabled Composio tool slugs for execution-time policy checks.
 */
export async function getWorkspaceDisabledToolsForSlug(
  workspaceId: string,
  toolSlug: string,
): Promise<string[]> {
  const provider = getComposioProviderForToolSlug(toolSlug);
  if (!provider) {
    return [];
  }

  if (provider === "gmail" || provider === "googlecalendar") {
    return loadGoogleDisabledTools(workspaceId);
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  return getDisabledToolsFromConfig(
    row?.config as Record<string, unknown> | null,
  );
}

/**
 * Load connector runtime status for the Settings → Connectors catalog.
 */
export async function getConnectorsPageData(): Promise<ConnectorsPageData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emptyStatus: Record<ConnectorCatalogId, ConnectorRuntimeStatus> = {
    google: { connected: false },
    "google-calendar": { connected: false },
    "google-drive": { connected: false },
    stripe: { connected: false },
  };

  if (!user) {
    return {
      workspaceId: null,
      connectors: emptyStatus,
      disabledToolsByConnector: {},
    };
  }

  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const workspaceId = workspaceMember?.workspace_id ?? null;

  if (!workspaceId) {
    const stripe = await getStripeStatus();
    return {
      workspaceId: null,
      connectors: { ...emptyStatus, stripe },
      disabledToolsByConnector: {},
    };
  }

  const [gmailStatus, calendarStatus, stripe, googleDisabledTools] =
    await Promise.all([
      getConnectionStatus("gmail", workspaceId),
      getConnectionStatus("googlecalendar", workspaceId),
      getStripeStatus(),
      loadGoogleDisabledTools(workspaceId),
    ]);

  const googleConnected = gmailStatus.connected || calendarStatus.connected;
  const googleEmail = gmailStatus.email ?? calendarStatus.email ?? undefined;

  return {
    workspaceId,
    connectors: {
      google: {
        connected: googleConnected,
        label: googleEmail,
      },
      "google-calendar": {
        connected: calendarStatus.connected,
        label: calendarStatus.email ?? undefined,
      },
      "google-drive": { connected: false },
      stripe,
    },
    disabledToolsByConnector: {
      google: googleDisabledTools,
      "google-calendar": googleDisabledTools,
    },
  };
}
