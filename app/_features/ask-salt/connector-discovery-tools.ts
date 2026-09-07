import "server-only";

/**
 * Two-stage connector tool exposure (connector-platform Phase 5.5.2).
 *
 * Context cost stays CONSTANT in connector count: the pinned core set (the
 * manifest-equivalent preload for connected head toolkits) plus these two
 * meta-tools —
 *
 *   1. search_connector_tools: query the synced catalog for approved tools
 *      on connected toolkits (approved classifications ∩ connected toolkits
 *      ∩ workspace policy only).
 *   2. execute_connector_action: one generic executor that resolves the
 *      synced JSON schema, validates arguments at the boundary, and calls
 *      executeComposioAction — the same fail-closed gate as everything else.
 *
 * Adding connector #4000 changes nothing about this route. Mutations via the
 * generic executor are NOT auto-approved: the gate blocks them with a
 * message steering the model to the approval flow (preview-first UX is
 * 5.5.3).
 */

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import { getApprovedToolClassification } from "@/app/_lib/composio/classification-store";
import { getSyncedToolSchema } from "@/app/_lib/composio/input-schema-store";
import { validateArgsAgainstJsonSchema } from "@/app/_lib/composio/json-schema-validate";
import { compactInputSchema } from "@/app/_lib/composio/compact-schema";

export interface BuildConnectorDiscoveryToolsOptions {
  workspaceId: string;
  userId?: string;
  /** Toolkits with an active connection this turn. */
  connectedToolkits: readonly string[];
  /** Composio connected-account id per toolkit. */
  connectionIdByToolkit: Record<string, string>;
}

const SearchSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(120)
    .describe("What you want to do, e.g. 'create a page' or 'list channels'."),
  toolkit: z
    .string()
    .optional()
    .describe("Restrict to one connected toolkit slug (e.g. 'notion')."),
});

/**
 * The search query is model-supplied and the model can be steered by
 * untrusted connector content — and it lands inside a PostgREST `.or()`
 * filter expression where commas, parentheses, dots, and wildcards are
 * metacharacters. Strict allowlist: letters, digits, spaces, hyphens.
 */
export function sanitizeCatalogQuery(query: string): string {
  return query
    .replace(/[^a-zA-Z0-9 -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ExecuteSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(120)
    .describe("Exact tool slug from search_connector_tools."),
  arguments: z
    .record(z.string(), z.unknown())
    .describe("Arguments matching the tool's input schema."),
});

export function buildConnectorDiscoveryTools(
  options: BuildConnectorDiscoveryToolsOptions,
): ToolSet {
  const {
    workspaceId,
    userId,
    connectedToolkits,
    connectionIdByToolkit,
  } = options;

  if (connectedToolkits.length === 0) {
    return {};
  }

  const searchConnectorTools = tool({
    description:
      "Search the catalog of tools available on the user's CONNECTED apps. Use when the preloaded tools don't cover a request. Returns tool slugs to pass to execute_connector_action, each with its argument schema — use those exact argument names, never invent others.",
    inputSchema: SearchSchema,
    execute: async ({ query, toolkit }) => {
      const admin = createAdminClient();
      const scope = toolkit
        ? connectedToolkits.filter((t) => t === toolkit)
        : [...connectedToolkits];
      if (scope.length === 0) {
        return { tools: [], note: `Toolkit '${toolkit}' is not connected.` };
      }

      const sanitized = sanitizeCatalogQuery(query);
      if (!sanitized) {
        return { tools: [], note: "Query contained no searchable characters." };
      }
      const pattern = `%${sanitized}%`;
      // No FK between connector_tools and tool_classifications (orphan rows
      // block adding one), so PostgREST resource embedding fails — query the
      // catalog first, then fetch approvals for just those ≤20 slugs.
      const { data, error } = await admin
        .from("connector_tools")
        .select("tool_slug, toolkit_slug, name, description, input_schema")
        .in("toolkit_slug", scope)
        .or(`name.ilike.${pattern},description.ilike.${pattern},tool_slug.ilike.${pattern}`)
        .limit(20);

      if (error) {
        return { tools: [], note: `Catalog search failed: ${error.message}` };
      }

      const slugs = (data ?? []).map((row) => row.tool_slug);
      const { data: approvals } = slugs.length
        ? await admin
            .from("tool_classifications")
            .select("tool_slug, risk")
            .in("tool_slug", slugs)
            .eq("status", "approved")
        : { data: [] };
      const approvedRiskBySlug = new Map(
        (approvals ?? []).map((row) => [row.tool_slug, row.risk] as const),
      );

      const rows = (data ?? [])
        .filter((row) => approvedRiskBySlug.has(row.tool_slug))
        .map((row) => ({
          slug: row.tool_slug,
          toolkit: row.toolkit_slug,
          name: row.name,
          description: row.description?.slice(0, 200) ?? null,
          risk: approvedRiskBySlug.get(row.tool_slug) ?? "unknown",
          // Compact schema projection — the model sees real argument names
          // and enums instead of guessing them. Full schemas stay out of
          // context (too large); execute_connector_action validates against
          // the full synced schema at the boundary.
          input_schema: compactInputSchema(row.input_schema) ?? undefined,
        }))
        // Destructive tools never execute via AI — don't advertise them.
        .filter((row) => row.risk !== "destructive");

      const note =
        rows.length === 0
          ? "No approved tools matched. The catalog only lists tools reviewed for AI use on connected apps."
          : undefined;

      return { tools: rows, note };
    },
  });

  const executeConnectorAction = tool({
    description:
      "Execute a connector tool found via search_connector_tools. Read tools run directly; anything that modifies external data shows the user a preview and needs their one-tap approval first.",
    inputSchema: ExecuteSchema,
    // Preview-first mutations (5.5.3): read-class runs directly; everything
    // else pauses for in-thread approval. Unknown/unclassified defaults to
    // requiring approval — the gate would fail it closed anyway.
    needsApproval: async ({ slug }) => {
      const policy = await getApprovedToolClassification(slug);
      return policy ? policy.risk !== "read" : true;
    },
    execute: async ({ slug, arguments: args }) => {
      const synced = await getSyncedToolSchema(slug);
      if (!synced) {
        return {
          ok: false,
          error: `Tool ${slug} is not in the synced catalog — search first and use an exact slug.`,
        };
      }
      const connectionId = connectionIdByToolkit[synced.toolkit];
      if (!connectionId) {
        return {
          ok: false,
          error: `The ${synced.toolkit} app is not connected in this workspace.`,
        };
      }

      try {
        validateArgsAgainstJsonSchema(args, synced.inputSchema, slug);
        // Reaching execute for a non-read tool means the user approved the
        // previewed call in-thread (needsApproval above).
        const policy = await getApprovedToolClassification(slug);
        const humanApproved = policy ? policy.risk !== "read" : undefined;
        // The gate re-validates and enforces classification (fail closed),
        // the trust ladder, and approval — and audits the run.
        const result = await executeComposioAction<Record<string, unknown>, unknown>(
          slug,
          args,
          connectionId,
          workspaceId,
          {
            workspaceId,
            actorUserId: userId,
            source: "ask_salt",
            humanApproved,
          },
        );
        return { ok: true, result };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Execution failed",
        };
      }
    },
  });

  return {
    search_connector_tools: searchConnectorTools,
    execute_connector_action: executeConnectorAction,
  };
}
