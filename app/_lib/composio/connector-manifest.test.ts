import { describe, expect, it } from "vitest";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import {
  getComposioToolPolicy,
  listAgentExposableToolSlugs,
} from "./tool-policy-registry";
import { composioToolInputSchemas } from "./tool-policy";

/**
 * Ask Salt toolkits enabled today (mirror of connector_overrides rows with
 * ask_salt_slug_prefix set — the runtime set is DB-driven via
 * listAskSaltEntries()). Composio names every tool TOOLKIT_ACTION, so the
 * slug prefix derives from the toolkit key by convention.
 */
const ASK_SALT_TOOLKITS = [
  "gmail",
  "googlecalendar",
  "googledocs",
  "googledrive",
  "googlesheets",
  "googleslides",
  "stripe",
] as const;

function slugPrefix(toolkit: string): string {
  return `${toolkit.toUpperCase()}_`;
}

/**
 * Consistency guard: adding a connector or tool to Ask Salt touches several
 * registries (DB manifest, policy, Zod schema). These tests fail CI when any
 * of them drift out of sync — a half-registered connector silently drops
 * tools or skips argument validation in production, so it must never merge.
 */
describe("connector manifest integrity", () => {
  it("has unique toolkits and slug prefixes", () => {
    const prefixes = ASK_SALT_TOOLKITS.map(slugPrefix);
    expect(new Set(ASK_SALT_TOOLKITS).size).toBe(ASK_SALT_TOOLKITS.length);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("agrees with getComposioProviderForToolSlug for every connector", () => {
    for (const toolkit of ASK_SALT_TOOLKITS) {
      const probeSlug = `${slugPrefix(toolkit)}PROBE_ACTION`;
      expect(getComposioProviderForToolSlug(probeSlug)).toBe(toolkit);
    }
  });

  it("exposes at least one runnable tool per connector (no half-registered connector)", () => {
    const exposable = listAgentExposableToolSlugs();
    for (const toolkit of ASK_SALT_TOOLKITS) {
      const matching = exposable.filter((slug) =>
        slug.startsWith(slugPrefix(toolkit)),
      );
      expect(
        matching.length,
        `Ask Salt connector "${toolkit}" has no policy-exposable tools — register tools or remove it from the manifest.`,
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

  it("every agent-exposable slug for an Ask Salt connector has policy and schema", () => {
    const prefixes = ASK_SALT_TOOLKITS.map(slugPrefix);
    for (const slug of listAgentExposableToolSlugs()) {
      // Non-Ask-Salt connectors (calcom, fireflies) legitimately don't match.
      if (prefixes.some((prefix) => slug.startsWith(prefix))) {
        expect(getComposioToolPolicy(slug)).not.toBeNull();
        expect(composioToolInputSchemas[slug]).toBeDefined();
      }
    }
  });
});
