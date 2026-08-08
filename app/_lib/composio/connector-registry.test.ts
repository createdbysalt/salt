import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let catalogRows: Array<Record<string, unknown>> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "connector_catalog") {
        return {
          select: () => Promise.resolve({ data: catalogRows, error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import {
  invalidateConnectorRegistryCache,
  listConnectableEntries,
} from "./connector-registry";

function catalogRow(
  providerKey: string,
  override: {
    tier?: "catalog_only" | "action" | "capture";
    auth_config_id?: string | null;
    capture_category?: string | null;
  } | null,
  catalog: { coming_soon?: boolean; sync_status?: string } = {},
): Record<string, unknown> {
  return {
    provider_key: providerKey,
    toolkit_slug: providerKey.toUpperCase(),
    name: providerKey,
    description: "",
    category: "other",
    auth_method: "oauth",
    coming_soon: catalog.coming_soon ?? false,
    logo_url: null,
    meta: {},
    sync_status: catalog.sync_status ?? "active",
    connector_overrides: override
      ? {
          tier: override.tier ?? "catalog_only",
          auth_config_id: override.auth_config_id ?? null,
          auth_config_env_var: null,
          api_key_field_name: null,
          api_key_form: null,
          ask_salt_slug_prefix: null,
          ask_salt_label: null,
          featured: false,
          capture_category: override.capture_category ?? null,
        }
      : null,
  };
}

beforeEach(() => {
  catalogRows = [];
  invalidateConnectorRegistryCache();
});

describe("listConnectableEntries", () => {
  it("excludes catalog_only connectors even with a resolved auth config (plan 5.5)", async () => {
    catalogRows = [
      catalogRow("gmail", { tier: "capture", auth_config_id: "ac_gmail" }),
      catalogRow("hubspot", { tier: "action", auth_config_id: "ac_hubspot" }),
      // The 5.5 case: shallow-synced long tail with a pinned auth config —
      // connectable before the tier gate, browse-only after.
      catalogRow("square", { tier: "catalog_only", auth_config_id: "ac_square" }),
      // No override row at all → default catalog_only.
      catalogRow("someapp", null),
      // Action tier but no auth config → not connectable.
      catalogRow("noauth", { tier: "action", auth_config_id: null }),
      // Capture tier but removed upstream → not connectable.
      catalogRow("gone", { tier: "capture", auth_config_id: "ac_gone" }, { sync_status: "removed" }),
    ];

    const entries = await listConnectableEntries();

    expect(entries.map((e) => e.providerKey).sort()).toEqual(["gmail", "hubspot"]);
  });

  it("defaults providers without an override row to catalog_only", async () => {
    catalogRows = [catalogRow("someapp", null)];

    const entries = await listConnectableEntries();

    expect(entries).toEqual([]);
  });
});
