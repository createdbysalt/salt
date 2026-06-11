import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import {
  getComposioProviderForToolSlug,
  getGoogleToolPreferenceProviders,
} from "./connector-capabilities";
import { getDisabledToolsFromConfig } from "./connector-config";
import type {
  ConnectorActivityEntry,
  ConnectorsPageData,
  ConnectorRuntimeStatus,
} from "./types";
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

async function loadDisabledToolsByProvider(
  workspaceId: string,
  providers: readonly string[],
): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("workspace_integrations")
    .select("provider, config")
    .eq("workspace_id", workspaceId)
    .in("provider", [...providers]);

  const byProvider: Record<string, string[]> = {};
  for (const row of rows ?? []) {
    byProvider[row.provider as string] = getDisabledToolsFromConfig(
      row.config as Record<string, unknown> | null,
    );
  }
  return byProvider;
}

async function loadGoogleDisabledTools(
  workspaceId: string,
): Promise<string[]> {
  const byProvider = await loadDisabledToolsByProvider(workspaceId, [
    ...getGoogleToolPreferenceProviders(),
  ]);
  const disabled = new Set<string>(Object.values(byProvider).flat());
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
 * Recent tool executions for a connector's providers, newest first.
 * RLS limits reads to workspace owners/admins; others get an empty list.
 */
export async function getConnectorActivity(
  workspaceId: string,
  providers: readonly string[],
  limit = 30,
): Promise<ConnectorActivityEntry[]> {
  if (providers.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("workspace_tool_executions")
    .select(
      "id, tool_slug, provider, risk, source, status, args_summary, error, approved_by, created_at",
    )
    .eq("workspace_id", workspaceId)
    .in("provider", [...providers])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[connectors] failed to load tool activity:", error);
    return [];
  }

  return (rows ?? []).map((row) => ({
    id: row.id as string,
    toolSlug: row.tool_slug as string,
    provider: (row.provider as string | null) ?? null,
    risk: row.risk as ConnectorActivityEntry["risk"],
    source: row.source as ConnectorActivityEntry["source"],
    status: row.status as ConnectorActivityEntry["status"],
    argsSummary: (row.args_summary as Record<string, unknown> | null) ?? null,
    error: (row.error as string | null) ?? null,
    approvedBy: (row.approved_by as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
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

  const [gmailStatus, calendarStatus, stripe, disabledByProvider] =
    await Promise.all([
      getConnectionStatus("gmail", workspaceId),
      getConnectionStatus("googlecalendar", workspaceId),
      getStripeStatus(),
      loadDisabledToolsByProvider(workspaceId, [
        ...getGoogleToolPreferenceProviders(),
      ]),
    ]);

  // Per-app connectors: each tile reflects only its own provider.
  return {
    workspaceId,
    connectors: {
      google: {
        connected: gmailStatus.connected,
        label: gmailStatus.email ?? undefined,
      },
      "google-calendar": {
        connected: calendarStatus.connected,
        label: calendarStatus.email ?? undefined,
      },
      "google-drive": { connected: false },
      stripe,
    },
    disabledToolsByConnector: {
      google: disabledByProvider.gmail ?? [],
      "google-calendar": disabledByProvider.googlecalendar ?? [],
    },
  };
}
