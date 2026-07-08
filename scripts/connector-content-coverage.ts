/**
 * Connector content coverage report (content contract 2026-07-07).
 *
 * Prints, per VISIBLE connector, which content-contract fields are real vs on
 * a fallback — so "which connector pages are complete" is measurable across
 * all 92, like the memory field coverage matrix. Read-only; hits staging.
 *
 * Usage:
 *   SUPA_URL=$(op read "op://<vault>/<item>/<field>") \
 *   SUPA_KEY=$(op read "op://<vault>/<item>/<field>") \
 *   pnpm tsx scripts/connector-content-coverage.ts
 */
const url = process.env.SUPA_URL;
const key = process.env.SUPA_KEY;
if (!url || !key) {
  console.error("SUPA_URL and SUPA_KEY are required");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  return (await res.json()) as T;
}

interface CatalogRow {
  provider_key: string;
  toolkit_slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  meta: Record<string, unknown> | null;
}

// Head connectors with curated overview/meta (mirror of the code registries).
const CURATED_OVERVIEW = new Set([
  "google",
  "google-calendar",
  "google-drive",
  "google-docs",
  "google-sheets",
  "google-slides",
  "stripe",
]);
const CURATED_META = new Set(["google", "google-calendar", "stripe", "google-drive"]);

async function main() {
  const catalog = await get<CatalogRow[]>(
    "connector_catalog?select=provider_key,toolkit_slug,name,description,logo_url,meta&meta->>showInCatalog=eq.true",
  );
  // Approved tool counts per toolkit.
  const classifications = await get<{ tool_slug: string }[]>(
    "tool_classifications?select=tool_slug&status=eq.approved",
  );
  const approved = new Set(classifications.map((c) => c.tool_slug));
  const tools = await get<{ toolkit_slug: string; tool_slug: string }[]>(
    "connector_tools?select=toolkit_slug,tool_slug&sync_status=neq.removed",
  );
  const approvedByToolkit = new Map<string, number>();
  for (const t of tools) {
    if (approved.has(t.tool_slug)) {
      approvedByToolkit.set(
        t.toolkit_slug,
        (approvedByToolkit.get(t.toolkit_slug) ?? 0) + 1,
      );
    }
  }

  const rows: string[] = [];
  let incomplete = 0;
  for (const c of catalog.sort((a, b) => a.provider_key.localeCompare(b.provider_key))) {
    const meta = c.meta ?? {};
    const catalogId = (meta.catalogId as string) ?? c.provider_key;
    const toolCount = approvedByToolkit.get(c.toolkit_slug) ?? 0;

    const has = {
      name: Boolean(c.name),
      logo: Boolean(c.logo_url),
      tagline: Boolean(c.description),
      // overview is REQUIRED and always satisfiable (curated or derived from tools)
      overview: CURATED_OVERVIEW.has(catalogId) || toolCount > 0,
      tools: toolCount > 0,
      developer: CURATED_META.has(catalogId), // curated-optional
      links: CURATED_META.has(catalogId), // curated-optional
    };
    // A page is "complete" when every REQUIRED field resolves.
    const requiredOk = has.name && has.logo && has.tagline && has.overview && has.tools;
    if (!requiredOk) incomplete += 1;

    rows.push(
      `${requiredOk ? "✓" : "✗"} ${c.provider_key.padEnd(20)} ` +
        `tools:${String(toolCount).padStart(3)}  ` +
        `overview:${has.overview ? (CURATED_OVERVIEW.has(catalogId) ? "curated" : "derived") : "MISSING"}  ` +
        `dev:${has.developer ? "curated" : "—"}  links:${has.links ? "curated" : "—"}`,
    );
  }

  console.log(`Connector content coverage — ${catalog.length} visible connectors\n`);
  console.log(rows.join("\n"));
  console.log(
    `\n${catalog.length - incomplete}/${catalog.length} have all REQUIRED fields. ` +
      `${incomplete} incomplete (missing tools/overview — classify their tools).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
