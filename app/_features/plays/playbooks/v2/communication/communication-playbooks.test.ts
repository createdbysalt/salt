import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parsePlaybookV2Yaml } from "../../schema/v2/parser";

/**
 * The email-triage/email-digest playbooks were dead for months because
 * validation errors are silent (docs/guides/playbook-troubleshooting.md).
 * These tests keep the revived definitions loud: if a schema or signal
 * registry change breaks them, CI fails instead of the playbook vanishing.
 */
describe("communication playbooks validate", () => {
  for (const slug of ["email-triage", "email-digest"] as const) {
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

  it("email-triage steps are executable step types", () => {
    const content = readFileSync(
      join(__dirname, "email-triage", "definition.yaml"),
      "utf-8"
    );
    const result = parsePlaybookV2Yaml(content, {
      fileLabel: "email-triage",
      validateSignals: true,
    });

    // The executor implements exactly these step types (branch included).
    const executable = new Set(["fetch", "classify", "draft", "action", "branch"]);
    for (const step of result.definition?.steps ?? []) {
      expect(executable.has(step.step)).toBe(true);
    }
  });
});
