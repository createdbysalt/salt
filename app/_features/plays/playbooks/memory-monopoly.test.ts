import { describe, expect, it } from "vitest";
import {
  isMemoryMutatingSlug,
  MEMORY_MUTATING_SLUGS,
  validateMemoryMonopoly,
} from "./memory-monopoly";

describe("memory-monopoly", () => {
  describe("isMemoryMutatingSlug", () => {
    it("returns true for memory-mutating slugs", () => {
      expect(isMemoryMutatingSlug("memory_create_person")).toBe(true);
      expect(isMemoryMutatingSlug("memory_update_org")).toBe(true);
      expect(isMemoryMutatingSlug("memory_link_person_org")).toBe(true);
      expect(isMemoryMutatingSlug("memory_create_note")).toBe(true);
    });

    it("returns false for read-only memory slugs", () => {
      expect(isMemoryMutatingSlug("memory_find_people")).toBe(false);
      expect(isMemoryMutatingSlug("memory_find_orgs")).toBe(false);
    });

    it("returns false for non-memory slugs", () => {
      expect(isMemoryMutatingSlug("GMAIL_CREATE_EMAIL_DRAFT")).toBe(false);
      expect(isMemoryMutatingSlug("STRIPE_CREATE_INVOICE")).toBe(false);
    });
  });

  describe("validateMemoryMonopoly", () => {
    it("rejects memory-mutating slugs in every section", () => {
      // No playbook section may write Memory — Memory Care owns mutations.
      const sections = [
        "relationships",
        "work",
        "billing",
        "files",
        "meetings",
        "me",
        "connections",
        "notes",
        "communication",
      ] as const;
      for (const section of sections) {
        const result = validateMemoryMonopoly(["memory_create_person"], section);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.violations).toContain("memory_create_person");
        }
      }
    });

    it("allows sections to use non-memory slugs", () => {
      const result = validateMemoryMonopoly(
        ["GMAIL_CREATE_EMAIL_DRAFT", "STRIPE_CREATE_INVOICE"],
        "relationships",
      );
      expect(result.ok).toBe(true);
    });

    it("returns all violations, not just the first", () => {
      const result = validateMemoryMonopoly(
        ["memory_create_person", "GMAIL_CREATE_EMAIL_DRAFT", "memory_update_org"],
        "billing",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.violations).toHaveLength(2);
        expect(result.violations).toContain("memory_create_person");
        expect(result.violations).toContain("memory_update_org");
      }
    });
  });

  describe("MEMORY_MUTATING_SLUGS", () => {
    it("includes all person memory mutations", () => {
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_create_person");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_update_person");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_archive_person");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_classify_person");
    });

    it("includes all org memory mutations", () => {
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_create_org");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_update_org");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_archive_org");
    });

    it("includes all work memory mutations", () => {
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_create_work");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_update_work");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_archive_work");
    });

    it("includes link/unlink mutations", () => {
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_link_person_org");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_unlink_person_org");
    });

    it("includes note and meeting creation", () => {
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_create_note");
      expect(MEMORY_MUTATING_SLUGS).toContain("memory_create_meeting");
    });
  });

  describe("parse-time enforcement (parser.ts)", () => {
    const baseYaml = (toolSlug: string, nested = false) => `
name: Test Playbook
slug: test-playbook
version: "1.0.0"
description: Test playbook for monopoly enforcement
section: relationships
layer: act
voice: professional
trigger:
  type: manual
tools:
  - ${toolSlug}
steps:
${
  nested
    ? `  - step: branch
    id: gate
    if: "true"
    steps:
      - step: action
        id: act
        tool: ${toolSlug}
        args: {}
`
    : `  - step: action
    id: act
    tool: ${toolSlug}
    args: {}
`
}
output:
  type: notification
  approval: auto
`;

    it("rejects a playbook whose action step uses a memory-mutating tool", async () => {
      const { parsePlaybookV2Yaml } = await import("./schema/v2/parser");
      const result = parsePlaybookV2Yaml(baseYaml("memory_create_person"));
      expect(result.validationErrors.some((e) => e.path === "steps")).toBe(true);
      expect(
        result.validationErrors.some((e) =>
          e.message.includes("memory_create_person")
        )
      ).toBe(true);
    });

    it("rejects memory-mutating tools nested inside branch steps", async () => {
      const { parsePlaybookV2Yaml } = await import("./schema/v2/parser");
      const result = parsePlaybookV2Yaml(baseYaml("memory_update_org", true));
      expect(
        result.validationErrors.some((e) => e.message.includes("memory_update_org"))
      ).toBe(true);
    });

    it("accepts non-memory tools", async () => {
      const { parsePlaybookV2Yaml } = await import("./schema/v2/parser");
      const result = parsePlaybookV2Yaml(baseYaml("GMAIL_CREATE_EMAIL_DRAFT"));
      expect(
        result.validationErrors.filter((e) => e.path === "steps")
      ).toHaveLength(0);
    });
  });

  // Runtime enforcement (executor-level guard) is tested in
  // schema/v2/executor.test.ts, which has the executor's full mock harness.
});
