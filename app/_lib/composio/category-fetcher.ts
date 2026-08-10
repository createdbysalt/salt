import "server-only";

/**
 * Category-Based Data Fetching
 *
 * Playbooks request data by category (e.g., "billing data") not by specific
 * connector (e.g., "Stripe data"). This module resolves categories to available
 * connectors and fetches data from whichever providers the workspace has connected.
 *
 * This enables connector-agnostic playbooks:
 * - Invoice-chase works with Stripe OR QuickBooks OR Xero
 * - Meeting-prep works with Google Calendar OR Outlook Calendar
 * - Relationship-health works with any email + CRM combination
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "./connections";
import { resolveCapabilityTool } from "./capability-resolver";
import {
  getCaptureCategoryMap,
  listProvidersForCategory,
} from "./capture-categories";
import type { ConnectorCategory } from "./enrichment/types";

export interface ConnectedCategory {
  category: ConnectorCategory;
  providers: string[];
  connectionIds: string[];
}

export interface CategoryFetchSpec {
  id: string;
  category: ConnectorCategory;
  capability: string;
  filter?: Record<string, unknown>;
  optional?: boolean;
}

export interface CategoryFetchResult {
  id: string;
  category: ConnectorCategory;
  capability: string;
  success: boolean;
  data?: unknown;
  provider?: string;
  error?: string;
}

/**
 * Get all connected connector categories for a workspace.
 *
 * Returns categories that have at least one active, connected provider.
 */
export async function getConnectedCategories(
  workspaceId: string
): Promise<ConnectedCategory[]> {
  const supabase = createAdminClient();

  const { data: integrations, error } = await supabase
    .from("workspace_integrations")
    .select("provider, composio_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .not("composio_connection_id", "is", null);

  if (error || !integrations) {
    return [];
  }

  const categoryMap = new Map<ConnectorCategory, { providers: string[]; connectionIds: string[] }>();
  const providerCategories = await getCaptureCategoryMap();

  for (const integration of integrations) {
    const category = providerCategories.get(integration.provider);
    // composio_connection_id is filtered non-null above; the guard narrows the type.
    if (!category || !integration.composio_connection_id) continue;

    let entry = categoryMap.get(category);
    if (!entry) {
      entry = { providers: [], connectionIds: [] };
      categoryMap.set(category, entry);
    }

    entry.providers.push(integration.provider);
    entry.connectionIds.push(integration.composio_connection_id);
  }

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    providers: data.providers,
    connectionIds: data.connectionIds,
  }));
}

/**
 * Check if a workspace has a specific category connected.
 */
export async function hasConnectedCategory(
  workspaceId: string,
  category: ConnectorCategory
): Promise<boolean> {
  const connected = await getConnectedCategories(workspaceId);
  return connected.some((c) => c.category === category);
}

/**
 * Get available capabilities for a category based on connected providers.
 */
export async function getCategoryCapabilities(
  workspaceId: string,
  category: ConnectorCategory
): Promise<string[]> {
  const supabase = createAdminClient();

  const providers = await listProvidersForCategory(category);

  if (providers.length === 0) {
    return [];
  }

  const { data: capabilities, error } = await supabase
    .from("tool_capabilities")
    .select("capability_key")
    .in("provider_key", providers);

  if (error || !capabilities) {
    return [];
  }

  const capabilityKeys = [...new Set(capabilities.map((c) => c.capability_key))];

  const available: string[] = [];
  for (const key of capabilityKeys) {
    const tool = await resolveCapabilityTool(key, workspaceId);
    if (tool) {
      available.push(key);
    }
  }

  return available;
}

/**
 * Fetch data by category and capability.
 *
 * Resolves the capability to a connected provider and executes the fetch.
 * Returns null if no provider is available (graceful degradation).
 */
export async function fetchByCategory(
  workspaceId: string,
  spec: CategoryFetchSpec
): Promise<CategoryFetchResult> {
  const tool = await resolveCapabilityTool(spec.capability, workspaceId);

  if (!tool) {
    return {
      id: spec.id,
      category: spec.category,
      capability: spec.capability,
      success: false,
      error: spec.optional
        ? "No provider available (optional)"
        : `No provider available for ${spec.capability}`,
    };
  }

  try {
    const data = await executeCapabilityFetch(tool, spec.filter);

    return {
      id: spec.id,
      category: spec.category,
      capability: spec.capability,
      success: true,
      data,
      provider: tool.provider,
    };
  } catch (error) {
    return {
      id: spec.id,
      category: spec.category,
      capability: spec.capability,
      success: false,
      provider: tool.provider,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

/**
 * Fetch multiple data sources in parallel.
 *
 * Required fetches that fail cause the whole batch to fail.
 * Optional fetches that fail return null data but don't fail the batch.
 */
export async function fetchMultipleByCategory(
  workspaceId: string,
  specs: CategoryFetchSpec[]
): Promise<{
  success: boolean;
  results: Record<string, CategoryFetchResult>;
  errors: string[];
}> {
  const results = await Promise.all(
    specs.map((spec) => fetchByCategory(workspaceId, spec))
  );

  const resultMap: Record<string, CategoryFetchResult> = {};
  const errors: string[] = [];

  for (const result of results) {
    resultMap[result.id] = result;

    if (!result.success) {
      const spec = specs.find((s) => s.id === result.id);
      if (spec && !spec.optional) {
        errors.push(result.error ?? `Failed to fetch ${result.id}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    results: resultMap,
    errors,
  };
}

/**
 * Check if a playbook's category requirements are met.
 */
export async function checkCategoryRequirements(
  workspaceId: string,
  required: ConnectorCategory[],
  optional: ConnectorCategory[]
): Promise<{
  satisfied: boolean;
  missing: ConnectorCategory[];
  available: ConnectorCategory[];
  optional: ConnectorCategory[];
}> {
  const connected = await getConnectedCategories(workspaceId);
  const connectedSet = new Set(connected.map((c) => c.category));

  const missing = required.filter((cat) => !connectedSet.has(cat));
  const available = required.filter((cat) => connectedSet.has(cat));
  const optionalAvailable = optional.filter((cat) => connectedSet.has(cat));

  return {
    satisfied: missing.length === 0,
    missing,
    available,
    optional: optionalAvailable,
  };
}

async function executeCapabilityFetch(
  _tool: Awaited<ReturnType<typeof resolveCapabilityTool>>,
  _filter?: Record<string, unknown>
): Promise<unknown> {
  // TODO: Implement actual Composio tool execution
  // This will call the resolved tool with the filter parameters
  // and return the data from the connected provider.
  //
  // For now, return a placeholder that indicates the tool was resolved
  // but execution is not yet implemented.
  return {
    _placeholder: true,
    _note: "Tool execution not yet implemented",
  };
}
