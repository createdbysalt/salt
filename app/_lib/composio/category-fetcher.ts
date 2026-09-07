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
import { resolveCapabilityTool, resolveCapabilityTools } from "./capability-resolver";
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
  /** Every provider that produced data (fan-out provenance). */
  providers?: string[];
  /** Concrete tool that produced the data (provenance for play presentation). */
  toolSlug?: string;
  error?: string;
}

/** Execution context threaded from the playbook run (system, session-less). */
export interface CategoryFetchOptions {
  workspaceId: string;
  /** The human whose playbook consent authorises this read (audit provenance). */
  actorUserId?: string | null;
  /**
   * Providers the play must not use. The executor computes this from
   * connected providers minus the owner's opt-in app_selections
   * (Overview → What it needs). New connections stay out until added.
   */
  excludeProviders?: ReadonlySet<string>;
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
 * Fans out across EVERY connected, approved, non-excluded provider for the
 * capability (multi-app fan-out, playbooks Phase 4): a workspace with Stripe
 * AND QuickBooks connected gets both reads merged. One provider failing
 * never sinks the others' data.
 *
 * Merge contract: a single successful provider returns its payload unchanged
 * (backward compatible); multiple providers concatenate their array payloads
 * with each object record tagged `_provider` so downstream steps can group
 * across apps (one email per client, not per app).
 */
export async function fetchByCategory(
  workspaceId: string,
  spec: CategoryFetchSpec,
  options?: CategoryFetchOptions
): Promise<CategoryFetchResult> {
  const tools = await resolveCapabilityTools(spec.capability, workspaceId, {
    excludeProviders: options?.excludeProviders,
  });

  if (tools.length === 0) {
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

  const { executeComposioAction } = await import("./actions");

  const settled = await Promise.all(
    tools.map(async (tool) => {
      try {
        const data = await executeCapabilityFetch(
          executeComposioAction,
          tool,
          spec.filter,
          {
            workspaceId,
            actorUserId: options?.actorUserId ?? null,
          }
        );
        return { tool, data } as const;
      } catch (error) {
        return {
          tool,
          error: error instanceof Error ? error.message : "Fetch failed",
        } as const;
      }
    })
  );

  const successes = settled.filter(
    (s): s is Extract<typeof s, { data: unknown }> => "data" in s
  );

  if (successes.length === 0) {
    return {
      id: spec.id,
      category: spec.category,
      capability: spec.capability,
      success: false,
      provider: tools[0].provider,
      toolSlug: tools[0].toolSlug,
      error: settled
        .map((s) => ("error" in s ? s.error : "Fetch failed"))
        .join("; "),
    };
  }

  const first = successes[0];

  // Shape is stable per workspace configuration, not per transient failure:
  // tag whenever the capability fanned out to multiple providers, even if
  // only one of them returned data this run.
  if (tools.length === 1) {
    return {
      id: spec.id,
      category: spec.category,
      capability: spec.capability,
      success: true,
      data: first.data,
      provider: first.tool.provider,
      providers: [first.tool.provider],
      toolSlug: first.tool.toolSlug,
    };
  }

  const merged = successes.flatMap((s) =>
    tagProviderRecords(s.data, s.tool.provider)
  );

  return {
    id: spec.id,
    category: spec.category,
    capability: spec.capability,
    success: true,
    data: merged,
    provider: first.tool.provider,
    providers: successes.map((s) => s.tool.provider),
    toolSlug: first.tool.toolSlug,
  };
}

/**
 * Normalise one provider's payload into records tagged with their source
 * app. Object records keep their fields; scalars wrap as `{ value }`.
 */
function tagProviderRecords(data: unknown, provider: string): unknown[] {
  if (Array.isArray(data)) {
    return data.map((record) =>
      record !== null && typeof record === "object" && !Array.isArray(record)
        ? { ...(record as Record<string, unknown>), _provider: provider }
        : { _provider: provider, value: record }
    );
  }
  if (data !== null && typeof data === "object") {
    return [{ ...(data as Record<string, unknown>), _provider: provider }];
  }
  return [{ _provider: provider, value: data }];
}

/**
 * Fetch multiple data sources in parallel.
 *
 * Required fetches that fail cause the whole batch to fail.
 * Optional fetches that fail return null data but don't fail the batch.
 */
export async function fetchMultipleByCategory(
  workspaceId: string,
  specs: CategoryFetchSpec[],
  options?: CategoryFetchOptions
): Promise<{
  success: boolean;
  results: Record<string, CategoryFetchResult>;
  errors: string[];
}> {
  const results = await Promise.all(
    specs.map((spec) => fetchByCategory(workspaceId, spec, options))
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

/**
 * Execute the resolved capability tool through the single Composio gate
 * (metering, classification, audit all live there — see
 * docs/architecture/billing-metering.md). Runs session-less like the play
 * executor's action path: consent provenance is the playbook the user
 * enabled, carried via the play context.
 */
async function executeCapabilityFetch(
  executeComposioAction: (typeof import("./actions"))["executeComposioAction"],
  tool: Awaited<ReturnType<typeof resolveCapabilityTool>>,
  filter: Record<string, unknown> | undefined,
  exec: { workspaceId: string; actorUserId: string | null }
): Promise<unknown> {
  if (!tool) {
    throw new Error("No resolved tool for capability fetch");
  }

  return executeComposioAction<Record<string, unknown>, unknown>(
    tool.toolSlug,
    translateFetchFilter(filter),
    tool.connectionId,
    // Composio v3 entity id is workspace-scoped; the human actor is carried
    // separately as actorUserId (same contract as execute-connector-tool).
    exec.workspaceId,
    {
      skipAuthCheck: true,
      workspaceId: exec.workspaceId,
      actorUserId: exec.actorUserId ?? undefined,
      source: "play",
      play: { approvedActions: [tool.toolSlug] },
    }
  );
}

/**
 * Playbook `where` filters are generic ("recent: true"), not vendor API
 * params. Translate the known conventions and bound the read so a fetch
 * step can never pull an unbounded history.
 */
function translateFetchFilter(
  filter: Record<string, unknown> | undefined
): Record<string, unknown> {
  const args: Record<string, unknown> = { ...(filter ?? {}) };

  if (args.recent === true) {
    delete args.recent;
    if (args.limit === undefined) args.limit = 10;
  }

  return args;
}
