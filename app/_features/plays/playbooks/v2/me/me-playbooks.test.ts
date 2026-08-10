import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parsePlaybookV2Yaml } from "../../schema/v2/parser";

vi.mock("server-only", () => ({}));

/**
 * Section-level loud-parse guard (same pattern as communication): if a schema
 * or signal-registry change breaks these definitions, CI fails instead of the
 * playbook vanishing (docs/guides/playbook-troubleshooting.md).
 */
describe("me playbooks validate", () => {
  for (const slug of ["getting-started", "create-first-playbook"] as const) {
    it(`${slug} parses with no validation errors`, () => {
      const content = readFileSync(
        join(__dirname, slug, "definition.yaml"),
        "utf-8"
      );
      const result = parsePlaybookV2Yaml(content, {
        fileLabel: slug,
        validateSignals: true,
      });

      expect(result.validationErrors).toEqual([]);
      expect(result.definition?.slug).toBe(slug);
    });
  }

  it("connector_connected dispatches to both onboarding playbooks", async () => {
    const { findPlaybooksForSignal } = await import("../../trigger-dispatch");
    const slugs = findPlaybooksForSignal("connector_connected").map(
      (p) => p.slug
    );
    expect(slugs).toContain("getting-started");
    expect(slugs).toContain("create-first-playbook");
  });
});
