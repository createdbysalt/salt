import { describe, expect, it } from "vitest";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import {
  getComposioToolPolicy,
  listAgentExposableToolSlugs,
} from "./tool-policy-registry";
import { composioToolInputSchemas } from "./tool-policy";
import {
  getAskSaltManifest,
  type AskSaltManifestEntry,
} from "./unified-connector-registry";

const ASK_SALT_CONNECTOR_MANIFEST: readonly AskSaltManifestEntry[] = getAskSaltManifest();

function manifestEntryForSlug(slug: string): AskSaltManifestEntry | null {
  return ASK_SALT_CONNECTOR_MANIFEST.find((entry) => slug.startsWith(entry.slugPrefix)) ?? null;
}

/**
 * Consistency guard: adding a connector or tool to Ask Salt touches several
 * registries (manifest, policy, Zod schema). These tests fail CI when any of
 * them drift out of sync — a half-registered connector silently drops tools or
 * skips argument validation in production, so it must never merge.
 */
describe("connector manifest integrity", () => {
  it("has unique toolkits and slug prefixes", () => {
    const toolkits = ASK_SALT_CONNECTOR_MANIFEST.map((e) => e.toolkit);
    const prefixes = ASK_SALT_CONNECTOR_MANIFEST.map((e) => e.slugPrefix);
    expect(new Set(toolkits).size).toBe(toolkits.length);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("agrees with getComposioProviderForToolSlug for every connector", () => {
    for (const entry of ASK_SALT_CONNECTOR_MANIFEST) {
      const probeSlug = `${entry.slugPrefix}PROBE_ACTION`;
      expect(getComposioProviderForToolSlug(probeSlug)).toBe(entry.catalogProvider);
      expect(manifestEntryForSlug(probeSlug)?.toolkit).toBe(entry.toolkit);
    }
  });

  it("exposes at least one runnable tool per connector (no half-registered connector)", () => {
    const exposable = listAgentExposableToolSlugs();
    for (const entry of ASK_SALT_CONNECTOR_MANIFEST) {
      const matching = exposable.filter((slug) => slug.startsWith(entry.slugPrefix));
      expect(
        matching.length,
        `Manifest connector "${entry.toolkit}" has no policy-exposable tools — register tools or remove it from the manifest.`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("policy and schema registries stay in sync", () => {
  it("every Zod-validated slug has a policy entry", () => {
    for (const slug of Object.keys(composioToolInputSchemas)) {
      expect(
        getComposioToolPolicy(slug),
        `Tool "${slug}" has an input schema but no policy entry.`,
      ).not.toBeNull();
    }
  });

  it("every agent-exposable slug has a Zod input schema", () => {
    for (const slug of listAgentExposableToolSlugs()) {
      expect(
        composioToolInputSchemas[slug],
        `Exposable tool "${slug}" has no Zod input schema — it would throw at execution.`,
      ).toBeDefined();
    }
  });

  it("every agent-exposable slug for an Ask Salt connector maps to the manifest", () => {
    for (const slug of listAgentExposableToolSlugs()) {
      const entry = manifestEntryForSlug(slug);
      // Non-Ask-Salt connectors (calcom, fireflies) legitimately return null.
      if (entry) {
        expect(getComposioToolPolicy(slug)).not.toBeNull();
        expect(composioToolInputSchemas[slug]).toBeDefined();
      }
    }
  });
});
