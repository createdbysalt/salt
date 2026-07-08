import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { isToolProvablyUnavailable } from "@/app/_lib/composio/scope-availability";
import { adapterForToolkit } from "@/app/_features/capture/adapters/registry";
import {
  getConnectorRegistry,
  getConnectorRegistryEntryByCatalogId,
  listConnectableEntries,
  type ConnectorRegistryEntry,
} from "@/app/_lib/composio/connector-registry";
import {
  getConnectorCapabilities,
  getToolPreferenceProviders,
  humanizeToolDescription,
  type ConnectorCapability,
  type ConnectorCapabilityGroups,
} from "./connector-capabilities";
import { deriveConnectorOverview } from "./content-contract";
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
 * Connectable entries come from the DB registry (connector_catalog +
 * connector_overrides): Composio-owned, not coming soon, with a resolved
 * auth config. Enabling a connector means flipping its DB row — never
 * editing a file. UI keying stays on the legacy kebab-case catalog id.
 */
function catalogKeyFor(entry: ConnectorRegistryEntry): ConnectorCatalogId {
  return (entry.catalogId ?? entry.providerKey) as ConnectorCatalogId;
}

/** Registry row → the client-facing ConnectorDefinition shape. */
function toConnectorDefinition(entry: ConnectorRegistryEntry): ConnectorDefinition {
  return {
    id: catalogKeyFor(entry),
    providerKey: entry.providerKey,
    name: entry.name,
    description: entry.description,
    category: entry.category as ConnectorDefinition["category"],
    ownership: "composio",
    authMethod: entry.authMethod === "api_key" ? "api_key" : "oauth",
    phase: (entry.phase ?? "2") as ConnectorDefinition["phase"],
    showInCatalog: entry.showInCatalog,
    composioProviders: [entry.providerKey],
    comingSoon: entry.comingSoon,
    apiKeyForm: (entry.apiKeyForm ?? undefined) as ConnectorDefinition["apiKeyForm"],
    connectHelp: entry.connectHelp ?? undefined,
    nativeBadge: entry.nativeBadge ?? undefined,
  };
}

/** DB-driven catalog rows for the client, canonical id keying. */
export async function listCatalogDefinitions(): Promise<ConnectorDefinition[]> {
  const registry = await getConnectorRegistry();
  return [...registry.values()]
    .filter((entry) => entry.showInCatalog)
    .map(toConnectorDefinition);
}

interface ProviderSettings {
  disabledTools: string[];
  trustLevel: ConnectorTrustLevel;
  emailMode: EmailMode;
  captureEnabled: boolean;
}

async function loadProviderSettings(
  workspaceId: string,
  providers: readonly string[],
): Promise<Record<string, ProviderSettings>> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("workspace_integrations")
    .select("provider, config, trust_level, capture_enabled")
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
      captureEnabled: row.capture_enabled === true,
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

  // Join the plain-language tool summary (same copy the Tools list shows) so
  // the activity log reads "Searched your calendar events", not a raw slug.
  const slugs = [...new Set((rows ?? []).map((row) => row.tool_slug as string))];
  const summaryBySlug = new Map<string, string>();
  if (slugs.length > 0) {
    const { data: classifications } = await supabase
      .from("tool_classifications")
      .select("tool_slug, model_proposal")
      .in("tool_slug", slugs);
    for (const row of classifications ?? []) {
      const proposal = row.model_proposal as { summary?: unknown } | null;
      if (proposal && typeof proposal.summary === "string" && proposal.summary) {
        summaryBySlug.set(row.tool_slug, proposal.summary);
      }
    }
  }

  return (rows ?? []).map((row) => ({
    id: row.id as string,
    toolSlug: row.tool_slug as string,
    provider: (row.provider as string | null) ?? null,
    risk: row.risk as ConnectorActivityEntry["risk"],
    source: row.source as ConnectorActivityEntry["source"],
    status: row.status as ConnectorActivityEntry["status"],
    argsSummary: (row.args_summary as Record<string, unknown> | null) ?? null,
    summary: summaryBySlug.get(row.tool_slug as string) ?? null,
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

  const [connectableEntries, catalog] = await Promise.all([
    listConnectableEntries(),
    listCatalogDefinitions(),
  ]);

  // Catalog ids without an implemented integration are simply absent (= not
  // connected); the catalog is far larger than the connectable set.
  const emptyStatus: Partial<Record<ConnectorCatalogId, ConnectorRuntimeStatus>> =
    Object.fromEntries(
      connectableEntries.map((entry) => [catalogKeyFor(entry), { connected: false }]),
    );

  if (!user) {
    return {
      workspaceId: null,
      catalog,
      connectors: emptyStatus,
      disabledToolsByConnector: {},
      settingsByConnector: {},
      captureByConnector: {},
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
      catalog,
      connectors: emptyStatus,
      disabledToolsByConnector: {},
      settingsByConnector: {},
      captureByConnector: {},
    };
  }

  const [statuses, settingsByProvider, workspaceTrustLevel] = await Promise.all([
    Promise.all(
      connectableEntries.map((entry) =>
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
  const captureByConnector: ConnectorsPageData["captureByConnector"] = {};

  // Per-app connectors: each tile reflects only its own provider. OAuth
  // connectors label with the account email; API-key connectors have no
  // email, so a plain "Connected".
  connectableEntries.forEach((entry, index) => {
    const status = statuses[index];
    const key = catalogKeyFor(entry);
    connectors[key] = {
      connected: status.connected,
      label:
        status.email ??
        (status.connected && entry.authMethod === "api_key"
          ? "Connected"
          : undefined),
      needsReconnect: status.composioStatus === "expired",
    };

    const settings = settingsByProvider[entry.providerKey];
    disabledToolsByConnector[key] = settings?.disabledTools ?? [];
    captureByConnector[key] = {
      capable: adapterForToolkit(entry.providerKey) !== null,
      enabled: settings?.captureEnabled ?? false,
    };
    settingsByConnector[key] =
      entry.providerKey === "gmail"
        ? {
            trustLevel: workspaceTrustLevel,
            emailMode: settings?.emailMode ?? "draft",
          }
        : defaultSettings;
  });

  return {
    workspaceId,
    catalog,
    connectors,
    disabledToolsByConnector,
    settingsByConnector,
    captureByConnector,
    workspaceTrustLevel,
  };
}

export interface ReconnectNeeded {
  /** Catalog id for deep-linking to the connector's detail. */
  catalogId: ConnectorCatalogId;
  provider: string;
  name: string;
}

/**
 * Connectors whose Composio connection expired and need re-auth. Drives the
 * proactive reconnect banner (Plays queue + HQ) so a silently-dead connection
 * — Google's 7-day testing-mode token expiry — never quietly stops Plays.
 */
export async function listReconnectNeeded(
  workspaceId: string,
): Promise<ReconnectNeeded[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("workspace_integrations")
    .select("provider")
    .eq("workspace_id", workspaceId)
    .eq("composio_status", "expired");

  if (error || !rows || rows.length === 0) {
    return [];
  }

  const registry = await getConnectorRegistry();
  const byProvider = new Map(
    [...registry.values()].map((entry) => [entry.providerKey, entry] as const),
  );

  const seen = new Set<string>();
  const result: ReconnectNeeded[] = [];
  for (const row of rows) {
    // Provider is stored plain ("gmail"); tolerate a legacy "composio:" prefix.
    const provider = (row.provider as string).replace(/^composio:/, "");
    if (seen.has(provider)) continue;
    seen.add(provider);
    const entry = byProvider.get(provider);
    if (!entry) continue;
    result.push({
      catalogId: (entry.catalogId ?? entry.providerKey) as ConnectorCatalogId,
      provider,
      name: entry.name,
    });
  }
  return result;
}

/**
 * DB-driven tool list for a connector's Tools section (founder decision
 * 2026-07-06): every APPROVED synced tool for the toolkit, grouped
 * read/write. Destructive tools are excluded — they can never execute, so
 * they are not user-toggleable. Curated overview bullets are kept where the
 * legacy static list has them; the tool rows themselves come from the DB.
 * Returns null when the connector has no synced tools yet (catalog_only
 * tier or sync not yet run) — callers fall back to the curated static list.
 */
export async function getConnectorToolGroups(
  catalogId: ConnectorCatalogId,
): Promise<ConnectorCapabilityGroups | null> {
  const entry = await getConnectorRegistryEntryByCatalogId(catalogId);
  if (!entry) return null;

  const supabase = await createClient();
  const { data: tools, error } = await supabase
    .from("connector_tools")
    .select("tool_slug, name, description, required_scopes")
    .eq("toolkit_slug", entry.toolkitSlug)
    .neq("sync_status", "removed")
    .order("name");
  if (error || !tools || tools.length === 0) return null;

  const { data: classifications } = await supabase
    .from("tool_classifications")
    .select("tool_slug, risk, requires_human_confirmation, model_proposal")
    .in(
      "tool_slug",
      tools.map((tool) => tool.tool_slug),
    )
    .eq("status", "approved");

  const classificationBySlug = new Map(
    (classifications ?? []).map((row) => [row.tool_slug, row] as const),
  );

  const read: ConnectorCapability[] = [];
  const write: ConnectorCapability[] = [];
  for (const tool of tools) {
    const classification = classificationBySlug.get(tool.tool_slug);
    const risk = classification?.risk;
    if (!risk || risk === "destructive") continue;
    // Scope wall: hide tools the connection's OAuth grant provably cannot
    // execute (certainty rules in scope-availability.ts — uncertain = show).
    if (
      isToolProvablyUnavailable({
        toolScopes: Array.isArray(tool.required_scopes)
          ? (tool.required_scopes as string[])
          : null,
        grantScopes: entry.grantScopes,
        risk,
      })
    ) {
      continue;
    }
    // Raw Composio descriptions are developer API docs — show the
    // plain-language summary from the classification pass, or a cleaned
    // first sentence until one exists.
    const proposal = classification.model_proposal as {
      summary?: unknown;
    } | null;
    const summary =
      proposal && typeof proposal.summary === "string" && proposal.summary
        ? proposal.summary
        : humanizeToolDescription(tool.description ?? "");
    const capability: ConnectorCapability = {
      id: tool.tool_slug.toLowerCase().replace(/_/g, "-"),
      label: tool.name,
      description: summary || undefined,
      risk: risk === "read" ? "read" : "write",
      toolSlug: tool.tool_slug,
    };
    (risk === "read" ? read : write).push(capability);
  }
  if (read.length === 0 && write.length === 0) return null;

  // Every connector gets a truthful overview: curated bullets win; otherwise
  // derive from the tool classes so the section is never empty (content
  // contract — consistent across all connectors, not just the head ones).
  const curated = getConnectorCapabilities(catalogId);
  const overviewBullets =
    curated && curated.overviewBullets.length > 0
      ? curated.overviewBullets
      : deriveConnectorOverview({
          name: entry.name,
          groups: { read, write, overviewBullets: [] },
          captureCapable: adapterForToolkit(entry.toolkitSlug) !== null,
        });

  return {
    read,
    write,
    overviewBullets,
  };
}
