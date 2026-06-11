"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { CONNECTOR_CATALOG_BY_ID } from "./connector-catalog";
import {
  getConnectorCapabilities,
  getGoogleToolPreferenceProviders,
  supportsToolPreferences,
} from "./connector-capabilities";
import { mergeDisabledToolsIntoConfig } from "./connector-config";
import { getConnectorActivity, getConnectorsPageData } from "./queries";
import type {
  ConnectorActivityEntry,
  ConnectorCatalogId,
  ConnectorsPageData,
} from "./types";

export type ConnectorActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function fetchConnectorsPageData(): Promise<ConnectorsPageData> {
  return getConnectorsPageData();
}

/** Providers whose audit rows belong to a connector tile. */
function connectorActivityProviders(connectorId: ConnectorCatalogId): string[] {
  if (connectorId === "google" || connectorId === "google-calendar") {
    return [...getGoogleToolPreferenceProviders()];
  }
  const definition = CONNECTOR_CATALOG_BY_ID[connectorId];
  return definition?.providerKey ? [definition.providerKey] : [];
}

export async function fetchConnectorActivity(
  connectorId: ConnectorCatalogId,
): Promise<ConnectorActionResult<ConnectorActivityEntry[]>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const providers = connectorActivityProviders(connectorId);
  if (providers.length === 0) {
    return { success: true, data: [] };
  }

  const entries = await getConnectorActivity(workspace.id, providers);
  return { success: true, data: entries };
}

function validateDisabledTools(
  connectorId: ConnectorCatalogId,
  disabledTools: string[],
): string[] | null {
  const capabilities = getConnectorCapabilities(connectorId);
  if (!capabilities) {
    return null;
  }

  const allowedSlugs = new Set(
    [...capabilities.read, ...capabilities.write]
      .map((capability) => capability.toolSlug)
      .filter((slug): slug is string => Boolean(slug)),
  );

  return disabledTools.filter((slug) => allowedSlugs.has(slug));
}

export async function updateConnectorToolPreferences(input: {
  connectorId: ConnectorCatalogId;
  disabledTools: string[];
}): Promise<ConnectorActionResult<void>> {
  const { connectorId, disabledTools } = input;

  if (!supportsToolPreferences(connectorId)) {
    return { success: false, error: "This connector does not support tool preferences." };
  }

  const validated = validateDisabledTools(connectorId, disabledTools);
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

  const definition = CONNECTOR_CATALOG_BY_ID[connectorId];
  const providers =
    connectorId === "google" || connectorId === "google-calendar"
      ? [...getGoogleToolPreferenceProviders()]
      : definition.providerKey
        ? [definition.providerKey]
        : [];

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
