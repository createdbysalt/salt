import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";

/**
 * DB-backed connector registry (scalable-connectors Phase 3).
 *
 * Source of truth for connector catalog display. All 250+ Composio apps
 * sync to `connector_catalog` via the nightly cron; this module reads
 * and caches the catalog for UI display.
 *
 * Key fields:
 * - `featured` — Salt-curated connectors for prominent display
 * - `showInCatalog` — whether to show in the browse UI
 * - `tier` — catalog_only | action | capture
 *
 * See `docs/architecture/connector-system.md` for the full architecture.
 */

export type ConnectorTier = "catalog_only" | "action" | "capture";

export interface ConnectorLink {
  label: string;
  href: string;
}

export interface ConnectorRegistryEntry {
  providerKey: string;
  toolkitSlug: string;
  name: string;
  description: string;
  category: string;
  authMethod: "oauth" | "api_key" | "no_auth";
  comingSoon: boolean;
  logoUrl: string | null;
  tier: ConnectorTier;
  /** Resolved: env override → pinned DB value. Empty string = not connectable. */
  authConfigId: string;
  /**
   * Salt capture taxonomy (email/calendar/billing/...) that selects the
   * webhook normalizer adapter. NULL = no capture normalizer. Distinct from
   * `category`, which is Composio's marketplace category.
   */
  captureCategory: string | null;
  apiKeyFieldName: string | null;
  apiKeyForm: Json | null;
  askSaltSlugPrefix: string | null;
  askSaltLabel: string | null;
  /** Legacy catalog id (kebab-case UI id) carried in meta for UI keying. */
  catalogId: string | null;
  showInCatalog: boolean;
  /** Salt-curated connector for prominent display in catalog. */
  featured: boolean;
  /** Display copy carried in meta (seeded from the legacy catalog). */
  connectHelp: string | null;
  nativeBadge: string | null;
  phase: string | null;
  /** OAuth scopes the pinned auth config requests (synced); null = unknown. */
  grantScopes: string[] | null;
  /** UI metadata from meta column */
  tagline: string | null;
  developedBy: string | null;
  links: ConnectorLink[];
}

interface RegistryCache {
  byProvider: Map<string, ConnectorRegistryEntry>;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60_000;
let cache: RegistryCache | null = null;

export function invalidateConnectorRegistryCache(): void {
  cache = null;
}

function resolveAuthConfigId(envVar: string | null, pinned: string): string {
  if (envVar) {
    const fromEnv = process.env[envVar];
    if (fromEnv) return fromEnv;
  }
  return pinned;
}

async function loadRegistry(): Promise<Map<string, ConnectorRegistryEntry>> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.byProvider;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("connector_catalog")
    .select(
      `provider_key, toolkit_slug, name, description, category, auth_method,
       coming_soon, logo_url, meta, sync_status,
       connector_overrides ( tier, auth_config_id, auth_config_env_var,
         api_key_field_name, api_key_form, ask_salt_slug_prefix, ask_salt_label,
         featured, capture_category )`,
    );

  if (error) {
    // Fail closed for connectability: an empty registry means nothing can
    // connect, which is the safe direction. Serve stale cache if we have one.
    console.error("[connector-registry] load failed:", error.message);
    if (cache) return cache.byProvider;
    throw new Error(`Connector registry unavailable: ${error.message}`);
  }

  const byProvider = new Map<string, ConnectorRegistryEntry>();
  for (const row of data ?? []) {
    const override = Array.isArray(row.connector_overrides)
      ? row.connector_overrides[0]
      : row.connector_overrides;
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, Json>)
        : {};
    byProvider.set(row.provider_key, {
      providerKey: row.provider_key,
      toolkitSlug: row.toolkit_slug,
      name: row.name,
      description: row.description,
      category: row.category,
      authMethod:
        row.auth_method === "api_key" || row.auth_method === "no_auth"
          ? row.auth_method
          : "oauth",
      comingSoon: row.coming_soon || row.sync_status === "removed",
      logoUrl: row.logo_url,
      tier: override?.tier ?? "catalog_only",
      authConfigId: resolveAuthConfigId(
        override?.auth_config_env_var ?? null,
        override?.auth_config_id ?? "",
      ),
      captureCategory: override?.capture_category ?? null,
      apiKeyFieldName: override?.api_key_field_name ?? null,
      apiKeyForm: override?.api_key_form ?? null,
      askSaltSlugPrefix: override?.ask_salt_slug_prefix ?? null,
      askSaltLabel: override?.ask_salt_label ?? null,
      catalogId: typeof meta.catalogId === "string" ? meta.catalogId : null,
      showInCatalog: meta.showInCatalog === true,
      featured: override?.featured === true,
      connectHelp: typeof meta.connectHelp === "string" ? meta.connectHelp : null,
      nativeBadge: typeof meta.nativeBadge === "string" ? meta.nativeBadge : null,
      phase: typeof meta.phase === "string" ? meta.phase : null,
      grantScopes: Array.isArray(meta.grantScopes)
        ? meta.grantScopes.filter(
            (scope): scope is string => typeof scope === "string",
          )
        : null,
      tagline: typeof meta.tagline === "string" ? meta.tagline : null,
      developedBy: typeof meta.developedBy === "string" ? meta.developedBy : null,
      links: Array.isArray(meta.links)
        ? (meta.links as unknown[])
            .filter(
              (link): link is { label: string; href: string } =>
                typeof link === "object" &&
                link !== null &&
                typeof (link as Record<string, unknown>).label === "string" &&
                typeof (link as Record<string, unknown>).href === "string",
            )
            .map((link) => ({ label: link.label, href: link.href }))
        : [],
    });
  }

  cache = { byProvider, expiresAt: Date.now() + CACHE_TTL_MS };
  return byProvider;
}

/** Full registry keyed by provider key. */
export async function getConnectorRegistry(): Promise<
  Map<string, ConnectorRegistryEntry>
> {
  return loadRegistry();
}

/** Single entry, or null when the provider is unknown. */
export async function getConnectorRegistryEntry(
  provider: string,
): Promise<ConnectorRegistryEntry | null> {
  const registry = await loadRegistry();
  return registry.get(provider) ?? null;
}

/** Entry looked up by the legacy kebab-case catalog id (UI keying). */
export async function getConnectorRegistryEntryByCatalogId(
  catalogId: string,
): Promise<ConnectorRegistryEntry | null> {
  const registry = await loadRegistry();
  for (const entry of registry.values()) {
    if (entry.catalogId === catalogId) return entry;
  }
  return null;
}

/** Replaces isComposioWorkspaceProvider: known provider key? */
export async function isRegisteredConnectorProvider(
  provider: string,
): Promise<boolean> {
  const registry = await loadRegistry();
  return registry.has(provider);
}

/** Replaces isComposioApiKeyProvider. */
export async function isApiKeyConnectorProvider(
  provider: string,
): Promise<boolean> {
  const entry = await getConnectorRegistryEntry(provider);
  return entry?.authMethod === "api_key";
}

/**
 * Connectable = has a resolved auth config and isn't comingSoon/removed.
 * Replaces the CONNECTABLE_ENTRIES module-scope filter in queries.ts.
 */
export async function listConnectableEntries(): Promise<
  ConnectorRegistryEntry[]
> {
  const registry = await loadRegistry();
  return [...registry.values()].filter(
    (entry) => entry.authConfigId !== "" && !entry.comingSoon,
  );
}

/** Ask Salt-exposed connectors (replaces ASK_SALT_CONNECTOR_MANIFEST). */
export async function listAskSaltEntries(): Promise<ConnectorRegistryEntry[]> {
  const registry = await loadRegistry();
  return [...registry.values()].filter(
    (entry) => entry.askSaltSlugPrefix !== null && entry.tier !== "catalog_only",
  );
}

/** Featured connectors — Salt-curated for prominent display. */
export async function listFeaturedEntries(): Promise<ConnectorRegistryEntry[]> {
  const registry = await loadRegistry();
  return [...registry.values()].filter(
    (entry) => entry.featured && entry.showInCatalog,
  );
}

/** All connectors visible in the catalog (featured + non-featured). */
export async function listCatalogEntries(): Promise<ConnectorRegistryEntry[]> {
  const registry = await loadRegistry();
  return [...registry.values()].filter((entry) => entry.showInCatalog);
}

/** All connectors in the registry (including hidden ones). */
export async function listAllEntries(): Promise<ConnectorRegistryEntry[]> {
  const registry = await loadRegistry();
  return [...registry.values()];
}
