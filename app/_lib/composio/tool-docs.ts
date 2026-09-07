import "server-only";

/**
 * Cached vendor doc snippets per connector tool (playbooks Phase 2).
 *
 * tool_docs rows are platform-global reference data (curated head-tool seeds,
 * refreshed by catalog sync) with a 7-day TTL. Draft/agent step prompts
 * include the notes for the tools the playbook declares so the model works
 * from real API semantics instead of guessing.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

/** Non-expired doc snippets for the given tool slugs. Never throws. */
export async function getToolDocs(
  slugs: readonly string[],
): Promise<Map<string, string>> {
  const docs = new Map<string, string>();
  if (slugs.length === 0) return docs;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tool_docs")
      .select("tool_slug, doc_markdown")
      .in("tool_slug", [...new Set(slugs)])
      .gt("expires_at", new Date().toISOString());

    if (error) throw error;
    for (const row of data ?? []) {
      if (row.tool_slug && row.doc_markdown) {
        docs.set(row.tool_slug, row.doc_markdown);
      }
    }
  } catch (error) {
    console.error(
      "[tool-docs] read failed:",
      error instanceof Error ? error.message : error,
    );
  }
  return docs;
}

const DEFAULT_BUDGET = 2000;

/**
 * Render the prompt section for a set of tool docs, bounded by a character
 * budget (tools in insertion order until the budget runs out).
 */
export function buildToolDocsPromptSection(
  docs: Map<string, string>,
  budget: number = DEFAULT_BUDGET,
): string | null {
  if (docs.size === 0) return null;

  const parts: string[] = [
    "Reference notes for the tools this playbook uses (vendor API docs):",
  ];
  let used = parts[0].length;

  for (const [slug, markdown] of docs) {
    const block = `\n\n## ${slug}\n${markdown}`;
    if (used + block.length > budget) break;
    parts.push(block);
    used += block.length;
  }

  return parts.length > 1 ? parts.join("") : null;
}
