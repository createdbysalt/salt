/**
 * Live toolkit browser (playbooks Phase 2): connected apps → approved
 * actions → compact input schemas. Backs the playbook authoring path so a
 * user (or the Ask Salt drafting flow) can see exactly what each connected
 * app can do and what arguments each action takes — from the synced catalog,
 * never a hardcoded list.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectorRegistry } from "@/app/_lib/composio/connector-registry";
import {
  compactInputSchema,
  type CompactSchemaField,
} from "@/app/_lib/composio/compact-schema";

export interface ToolkitBrowserTool {
  slug: string;
  name: string;
  summary: string | null;
  risk: "read" | "write";
  inputSchema: Record<string, CompactSchemaField> | null;
}

export interface ToolkitBrowserToolkit {
  providerKey: string;
  toolkitSlug: string;
  catalogId: string | null;
  label: string;
  tools: ToolkitBrowserTool[];
}

/** One joined catalog row: connector_tools ⋈ approved tool_classifications. */
export interface ToolkitBrowserRow {
  toolkitSlug: string;
  toolSlug: string;
  name: string;
  description: string | null;
  inputSchema: unknown;
  risk: string | null;
  modelProposal: { summary?: unknown } | null;
}

interface ToolkitRef {
  providerKey: string;
  toolkitSlug: string;
  catalogId: string | null;
  label: string;
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
}

/** Pure grouping/mapping — unit-tested without a database. */
export function groupToolkitBrowserRows(
  toolkits: readonly ToolkitRef[],
  rows: readonly ToolkitBrowserRow[],
): ToolkitBrowserToolkit[] {
  const byToolkit = new Map<string, ToolkitBrowserTool[]>();

  for (const row of rows) {
    if (!row.risk || row.risk === "destructive") continue;

    const proposalSummary =
      row.modelProposal && typeof row.modelProposal.summary === "string"
        ? row.modelProposal.summary
        : null;

    const tool: ToolkitBrowserTool = {
      slug: row.toolSlug,
      name: row.name,
      summary:
        proposalSummary ||
        (row.description ? firstSentence(row.description) : null),
      risk: row.risk === "read" ? "read" : "write",
      inputSchema: compactInputSchema(row.inputSchema),
    };

    const list = byToolkit.get(row.toolkitSlug) ?? [];
    list.push(tool);
    byToolkit.set(row.toolkitSlug, list);
  }

  return toolkits
    .map((toolkit) => ({
      ...toolkit,
      tools: byToolkit.get(toolkit.toolkitSlug) ?? [],
    }))
    .filter((toolkit) => toolkit.tools.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Connected apps for the workspace, each with its approved, non-destructive
 * tools and compact input schemas. Callers must be workspace-scoped already
 * (tenant guard verified membership): reads use the admin client because
 * workspace_integrations is a compatibility view whose RLS quirks have
 * burned system-context reads before.
 */
export async function getToolkitBrowserData(
  workspaceId: string,
): Promise<ToolkitBrowserToolkit[]> {
  const supabase = createAdminClient();

  const { data: integrations, error: integrationsError } = await supabase
    .from("workspace_integrations")
    .select("provider")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .eq("composio_status", "connected")
    .not("composio_connection_id", "is", null);

  if (integrationsError || !integrations?.length) return [];

  const registry = await getConnectorRegistry();
  const toolkits: ToolkitRef[] = [];
  for (const integration of integrations) {
    const entry = registry.get(integration.provider);
    if (!entry) continue;
    toolkits.push({
      providerKey: entry.providerKey,
      toolkitSlug: entry.toolkitSlug,
      catalogId: entry.catalogId,
      label: entry.name,
    });
  }
  if (toolkits.length === 0) return [];

  const toolkitSlugs = [...new Set(toolkits.map((t) => t.toolkitSlug))];

  const { data: tools, error: toolsError } = await supabase
    .from("connector_tools")
    .select("tool_slug, toolkit_slug, name, description, input_schema")
    .in("toolkit_slug", toolkitSlugs)
    .neq("sync_status", "removed")
    .order("name");

  if (toolsError || !tools?.length) return [];

  // No FK between connector_tools and tool_classifications (801 orphan
  // classification rows block adding one), so PostgREST joins are out — and
  // a single .in() over ~1k slugs exceeds the PostgREST URL limit. Chunk.
  const allSlugs = tools.map((tool) => tool.tool_slug);
  const classifications: Array<{
    tool_slug: string;
    risk: string | null;
    model_proposal: unknown;
  }> = [];
  const CHUNK = 100;
  for (let i = 0; i < allSlugs.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("tool_classifications")
      .select("tool_slug, risk, model_proposal")
      .in("tool_slug", allSlugs.slice(i, i + CHUNK))
      .eq("status", "approved");
    if (error) {
      console.error("[toolkit-browser] classifications read failed:", error.message);
      continue;
    }
    classifications.push(...(data ?? []));
  }

  const classificationBySlug = new Map(
    classifications.map((row) => [row.tool_slug, row] as const),
  );

  const rows: ToolkitBrowserRow[] = tools.map((tool) => {
    const classification = classificationBySlug.get(tool.tool_slug);
    return {
      toolkitSlug: tool.toolkit_slug,
      toolSlug: tool.tool_slug,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.input_schema,
      risk: classification?.risk ?? null,
      modelProposal:
        (classification?.model_proposal as { summary?: unknown } | null) ??
        null,
    };
  });

  return groupToolkitBrowserRows(toolkits, rows);
}
