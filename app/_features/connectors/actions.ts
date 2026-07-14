"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { getConnectorRegistryEntryByCatalogId } from "@/app/_lib/composio/connector-registry";
import {
  getConnectorCapabilities,
  type ConnectorCapabilityGroups,
} from "./connector-capabilities";
import {
  mergeDisabledToolsIntoConfig,
  mergeEmailModeIntoConfig,
} from "./connector-config";
import {
  getConnectorActivity,
  getConnectorsPageData,
  getConnectorToolGroups,
} from "./queries";
import type {
  ConnectorActivityEntry,
  ConnectorCatalogId,
  ConnectorEmailMode,
  ConnectorTrustLevel,
  ConnectorsPageData,
} from "./types";

export type ConnectorActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function fetchConnectorsPageData(): Promise<ConnectorsPageData> {
  return getConnectorsPageData();
}

/** Providers whose audit rows belong to a connector tile (per-app: one each). */
async function connectorActivityProviders(
  connectorId: ConnectorCatalogId,
): Promise<string[]> {
  const entry = await getConnectorRegistryEntryByCatalogId(connectorId);
  return entry ? [entry.providerKey] : [];
}

/**
 * Update the workspace-global trust level — the ONE switch in Settings.
 * Per-connector trust is retired; this governs every connector at once.
 */
export async function updateWorkspaceTrustLevel(
  trustLevel: ConnectorTrustLevel,
): Promise<ConnectorActionResult<void>> {
  if (trustLevel !== "read_only" && trustLevel !== "act_with_approval" && trustLevel !== "trust") {
    return { success: false, error: "Unknown trust level." };
  }

  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ trust_level: trustLevel })
    .eq("id", workspace.id);

  if (error) {
    console.error("[connectors] failed to save workspace trust level:", error);
    return { success: false, error: "Failed to save permissions." };
  }

  revalidatePath("/plays");
  revalidatePath("/settings");
  return { success: true, data: undefined };
}

/**
 * Update a connector's email mode (Gmail only). Trust is workspace-global —
 * see updateWorkspaceTrustLevel.
 */
export async function updateConnectorEmailMode(input: {
  connectorId: ConnectorCatalogId;
  emailMode: ConnectorEmailMode;
}): Promise<ConnectorActionResult<void>> {
  const { connectorId, emailMode } = input;

  if (emailMode !== "draft" && emailMode !== "send") {
    return { success: false, error: "Unknown email mode." };
  }

  const entry = await getConnectorRegistryEntryByCatalogId(connectorId);
  const provider = entry?.providerKey;
  // Email mode applies to email providers (Gmail, Outlook)
  const { getEmailProviders } = await import("@/app/_lib/composio/capability-config");
  const emailProviders = getEmailProviders();
  if (!provider || !emailProviders.includes(provider)) {
    return { success: false, error: "Email mode only applies to email providers." };
  }

  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from("workspace_integrations")
    .select("id, config")
    .eq("workspace_id", workspace.id)
    .eq("provider", provider)
    .maybeSingle();

  if (fetchError) {
    console.error("[connectors] failed to load integration row:", fetchError);
    return { success: false, error: "Failed to load connector settings." };
  }
  if (!row) {
    return {
      success: false,
      error: "Connect this integration before changing its permissions.",
    };
  }

  const nextConfig = mergeEmailModeIntoConfig(
    row.config as Record<string, unknown> | null,
    emailMode,
  );

  const { error: updateError } = await supabase
    .from("workspace_integrations")
    .update({ config: nextConfig })
    .eq("id", row.id);

  if (updateError) {
    console.error("[connectors] failed to save email mode:", updateError);
    return { success: false, error: "Failed to save permissions." };
  }

  revalidatePath("/plays");
  return { success: true, data: undefined };
}

export async function fetchConnectorActivity(
  connectorId: ConnectorCatalogId,
): Promise<ConnectorActionResult<ConnectorActivityEntry[]>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const providers = await connectorActivityProviders(connectorId);
  if (providers.length === 0) {
    return { success: true, data: [] };
  }

  const entries = await getConnectorActivity(workspace.id, providers);
  return { success: true, data: entries };
}

async function validateDisabledTools(
  connectorId: ConnectorCatalogId,
  disabledTools: string[],
): Promise<string[] | null> {
  // DB-driven tool list first (every approved synced tool); curated static
  // list as fallback so toggles keep working before the first catalog sync.
  const groups =
    (await getConnectorToolGroups(connectorId)) ??
    getConnectorCapabilities(connectorId);
  if (!groups) {
    return null;
  }

  const allowedSlugs = new Set(
    [...groups.read, ...groups.write]
      .map((capability) => capability.toolSlug)
      .filter((slug): slug is string => Boolean(slug)),
  );

  return disabledTools.filter((slug) => allowedSlugs.has(slug));
}

/**
 * Tools section data: every approved synced tool for the connector, grouped
 * read/write (destructive excluded — never available). Falls back to the
 * curated static list when the toolkit has no synced tools yet.
 */
export async function fetchConnectorTools(
  connectorId: ConnectorCatalogId,
): Promise<ConnectorActionResult<ConnectorCapabilityGroups>> {
  const { context } = await getTenantContext();
  requireWorkspaceMember(context);

  const groups =
    (await getConnectorToolGroups(connectorId)) ??
    getConnectorCapabilities(connectorId);
  if (!groups) {
    return { success: false, error: "Unknown connector." };
  }
  return { success: true, data: groups };
}

export async function updateConnectorToolPreferences(input: {
  connectorId: ConnectorCatalogId;
  disabledTools: string[];
}): Promise<ConnectorActionResult<void>> {
  const { connectorId, disabledTools } = input;

  // Tool preferences are supported for any connector with a DB-driven tool
  // list; the static allowlist only gates the pre-sync fallback.
  const validated = await validateDisabledTools(connectorId, disabledTools);
  if (validated === null) {
    return { success: false, error: "Unknown connector." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const workspaceId = workspace.id;

  // Per-app connectors: each tile manages only its own provider's config row.
  const providers = await connectorActivityProviders(connectorId);

  if (providers.length === 0) {
    return { success: false, error: "Connector has no persisted integration provider." };
  }

  const { data: rows, error: fetchError } = await supabase
    .from("workspace_integrations")
    .select("id, provider, config")
    .eq("workspace_id", workspaceId)
    .in("provider", providers);

  if (fetchError) {
    console.error("[connectors] failed to load integration rows:", fetchError);
    return { success: false, error: "Failed to load connector settings." };
  }

  if (!rows || rows.length === 0) {
    return {
      success: false,
      error: "Connect this integration before changing tool preferences.",
    };
  }

  for (const row of rows) {
    const mergedConfig = mergeDisabledToolsIntoConfig(
      row.config as Record<string, unknown> | null,
      validated,
    );

    const { error: updateError } = await supabase
      .from("workspace_integrations")
      .update({ config: mergedConfig })
      .eq("id", row.id);

    if (updateError) {
      console.error("[connectors] failed to save tool preferences:", updateError);
      return { success: false, error: "Failed to save tool preferences." };
    }
  }

  revalidatePath("/plays");
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Tool Approval Preferences (Trust Mode Phase 7)
// ---------------------------------------------------------------------------

export interface ToolApprovalPreference {
  toolSlug: string;
  requiresApproval: boolean;
}

/**
 * Get per-tool approval preferences for the workspace.
 * Only relevant in Trust mode — in Ask mode, all tools require approval.
 */
export async function getToolApprovalPreferences(): Promise<
  ConnectorActionResult<Record<string, boolean>>
> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_tool_preferences")
    .select("tool_slug, requires_approval")
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("[connectors] failed to load tool preferences:", error);
    return { success: false, error: "Failed to load tool preferences." };
  }

  const prefs: Record<string, boolean> = {};
  for (const row of data ?? []) {
    prefs[row.tool_slug] = row.requires_approval;
  }

  return { success: true, data: prefs };
}

/**
 * Update approval requirement for a single tool.
 * Only escalation allowed — can't set requires_approval=false for destructive tools.
 */
export async function updateToolApprovalPreference(
  toolSlug: string,
  requiresApproval: boolean,
): Promise<ConnectorActionResult<void>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;

  if (!userId) {
    return { success: false, error: "Sign in required." };
  }

  const supabase = await createClient();

  if (requiresApproval) {
    const { error } = await supabase
      .from("workspace_tool_preferences")
      .upsert(
        {
          workspace_id: workspace.id,
          tool_slug: toolSlug,
          requires_approval: true,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: "workspace_id,tool_slug" },
      );

    if (error) {
      console.error("[connectors] failed to set tool approval:", error);
      return { success: false, error: "Failed to save preference." };
    }
  } else {
    const { error } = await supabase
      .from("workspace_tool_preferences")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("tool_slug", toolSlug);

    if (error) {
      console.error("[connectors] failed to remove tool approval:", error);
      return { success: false, error: "Failed to save preference." };
    }
  }

  revalidatePath("/plays");
  return { success: true, data: undefined };
}
