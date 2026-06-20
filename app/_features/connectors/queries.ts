import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import {
  isComposioWorkspaceProvider,
  type ComposioWorkspaceProvider,
} from "@/app/_lib/composio/providers";
import { CONNECTOR_CATALOG } from "./connector-catalog";
import { getToolPreferenceProviders } from "./connector-capabilities";
import {
  getDisabledToolsFromConfig,
  getEmailModeFromConfig,
  type EmailMode,
} from "./connector-config";
import type {
  ConnectorActivityEntry,
  ConnectorDefinition,
  ConnectorsPageData,
  ConnectorRuntimeStatus,
  ConnectorTrustLevel,
  ConnectorTrustSettings,
} from "./types";
import type { ConnectorCatalogId } from "./types";

/**
 * Catalog entries connectable today: Composio-owned, not coming soon, with a
 * provider key the connections layer knows. Everything below derives from
 * this list — enabling a connector means flipping its catalog entry, never
 * editing this file.
 */
const CONNECTABLE_ENTRIES = CONNECTOR_CATALOG.filter(
  (
    entry,
  ): entry is ConnectorDefinition & { providerKey: ComposioWorkspaceProvider } =>
    entry.ownership === "composio" &&
    !entry.comingSoon &&
    typeof entry.providerKey === "string" &&
    isComposioWorkspaceProvider(entry.providerKey),
);

interface ProviderSettings {
  disabledTools: string[];
  trustLevel: ConnectorTrustLevel;
  emailMode: EmailMode;
}

async function loadProviderSettings(
  workspaceId: string,
  providers: readonly string[],
): Promise<Record<string, ProviderSettings>> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("workspace_integrations")
    .select("provider, config, trust_level")
    .eq("workspace_id", workspaceId)
    .in("provider", [...providers]);

  const byProvider: Record<string, ProviderSettings> = {};
  for (const row of rows ?? []) {
    const config = row.config as Record<string, unknown> | null;
    byProvider[row.provider as string] = {
      disabledTools: getDisabledToolsFromConfig(config),
      trustLevel:
        row.trust_level === "act_with_approval" ? "act_with_approval" : "read_only",
      emailMode: getEmailModeFromConfig(config),
    };
  }
  return byProvider;
}

/**
 * Workspace-global trust level (the ONE switch in Settings). Per-connector
 * trust is retired; `workspace_integrations.trust_level` is legacy.
 */
export async function getWorkspaceTrustLevel(
  workspaceId: string,
): Promise<ConnectorTrustLevel> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("trust_level")
    .eq("id", workspaceId)
    .maybeSingle();

  return data?.trust_level === "act_with_approval"
    ? "act_with_approval"
    : "read_only";
}

/**
 * All disabled Composio tool slugs for a workspace, merged across every
 * provider with tool toggles (Google family + Stripe).
 */
export async function getWorkspaceDisabledTools(
  workspaceId: string,
): Promise<string[]> {
  const byProvider = await loadProviderSettings(workspaceId, [
    ...getToolPreferenceProviders(),
  ]);
  const disabled = new Set<string>(
    Object.values(byProvider).flatMap((settings) => settings.disabledTools),
  );
  return [...disabled];
}

export interface WorkspaceConnectorPolicy {
  disabledTools: string[];
  /**
   * Workspace-global trust applied to every provider (one Settings switch;
   * per-connector trust is retired). The per-provider shape is kept so tool
   * registration and execution checks stay provider-keyed.
   */
  trustByProvider: Record<string, ConnectorTrustLevel>;
  /** Gmail email mode; absent config = draft, the safe default. */
  emailMode: EmailMode;
}

/**
 * Trust + tool toggles + email mode for a workspace's connectors,
 * loaded for tool registration and execution-time checks.
 */
export async function getWorkspaceConnectorPolicy(
  workspaceId: string,
): Promise<WorkspaceConnectorPolicy> {
  const [byProvider, workspaceTrust] = await Promise.all([
    loadProviderSettings(workspaceId, [...getToolPreferenceProviders()]),
    getWorkspaceTrustLevel(workspaceId),
  ]);

  const disabled = new Set<string>(
    Object.values(byProvider).flatMap((settings) => settings.disabledTools),
  );
  const trustByProvider: Record<string, ConnectorTrustLevel> = {};
  for (const provider of getToolPreferenceProviders()) {
    trustByProvider[provider] = workspaceTrust;
  }

  return {
    disabledTools: [...disabled],
    trustByProvider,
    emailMode: byProvider.gmail?.emailMode ?? "draft",
  };
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

  // Catalog ids without an implemented integration are simply absent (= not
  // connected); the catalog is far larger than the connectable set.
  const emptyStatus: Partial<Record<ConnectorCatalogId, ConnectorRuntimeStatus>> =
    Object.fromEntries(
      CONNECTABLE_ENTRIES.map((entry) => [entry.id, { connected: false }]),
    );

  if (!user) {
    return {
      workspaceId: null,
      connectors: emptyStatus,
      disabledToolsByConnector: {},
      settingsByConnector: {},
    };
  }

  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const workspaceId = workspaceMember?.workspace_id ?? null;

  if (!workspaceId) {
    return {
      workspaceId: null,
      connectors: emptyStatus,
      disabledToolsByConnector: {},
      settingsByConnector: {},
    };
  }

  const [statuses, settingsByProvider, workspaceTrustLevel] = await Promise.all([
    Promise.all(
      CONNECTABLE_ENTRIES.map((entry) =>
        getConnectionStatus(entry.providerKey, workspaceId),
      ),
    ),
    loadProviderSettings(workspaceId, [
      ...getToolPreferenceProviders(),
    ]),
    getWorkspaceTrustLevel(workspaceId),
  ]);

  // Trust is workspace-global; per-connector settings keep only email mode.
  const defaultSettings: ConnectorTrustSettings = {
    trustLevel: workspaceTrustLevel,
    emailMode: "draft",
  };

  const connectors: ConnectorsPageData["connectors"] = {};
  const disabledToolsByConnector: ConnectorsPageData["disabledToolsByConnector"] =
    {};
  const settingsByConnector: ConnectorsPageData["settingsByConnector"] = {};

  // Per-app connectors: each tile reflects only its own provider. OAuth
  // connectors label with the account email; API-key connectors have no
  // email, so a plain "Connected".
  CONNECTABLE_ENTRIES.forEach((entry, index) => {
    const status = statuses[index];
    connectors[entry.id] = {
      connected: status.connected,
      label:
        status.email ??
        (status.connected && entry.authMethod === "api_key"
          ? "Connected"
          : undefined),
    };

    const settings = settingsByProvider[entry.providerKey];
    disabledToolsByConnector[entry.id] = settings?.disabledTools ?? [];
    settingsByConnector[entry.id] =
      entry.providerKey === "gmail"
        ? {
            trustLevel: workspaceTrustLevel,
            emailMode: settings?.emailMode ?? "draft",
          }
        : defaultSettings;
  });

  return {
    workspaceId,
    connectors,
    disabledToolsByConnector,
    settingsByConnector,
    workspaceTrustLevel,
  };
}
