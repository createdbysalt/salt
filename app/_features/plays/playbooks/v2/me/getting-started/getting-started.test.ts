import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parsePlaybookV2Yaml } from "../../../schema/v2/parser";
import { isValidSignalKey } from "@/app/_lib/learning/signals";

/**
 * The getting-started playbook is the onboarding payoff — plays appear within
 * minutes of the first connect. Silent validation errors killed playbooks
 * before (docs/guides/playbook-troubleshooting.md), so this stays loud.
 */
describe("getting-started playbook", () => {
  const content = readFileSync(join(__dirname, "definition.yaml"), "utf-8");
  const result = parsePlaybookV2Yaml(content, {
    fileLabel: "getting-started",
    validateSignals: true,
  });

  it("parses with no validation errors", () => {
    expect(result.validationErrors).toEqual([]);
    expect(result.definition?.slug).toBe("getting-started");
  });

  it("triggers on the registered connector_connected signal", () => {
    expect(isValidSignalKey("connector_connected")).toBe(true);
    expect(result.definition?.trigger).toMatchObject({
      type: "signal",
      signal: "connector_connected",
    });
  });

  it("requires the email category", () => {
    expect(
      result.definition?.requirements?.categories?.required
    ).toContain("email");
  });

  it("declares every action step's tool in the allowlist", () => {
    const def = result.definition;
    const declared = new Set(def?.tools ?? []);
    expect(declared.has("GMAIL_SEND_EMAIL")).toBe(true);

    const actionTools: string[] = [];
    for (const step of def?.steps ?? []) {
      if (step.step === "action") actionTools.push(step.tool);
      if (step.step === "branch") {
        for (const nested of step.steps ?? []) {
          if (nested.step === "action") actionTools.push(nested.tool);
        }
      }
    }
    expect(actionTools.length).toBeGreaterThan(0);
    for (const tool of actionTools) {
      expect(declared.has(tool)).toBe(true);
    }
  });

  it("gates every send (approval: ask)", () => {
    const def = result.definition;
    for (const step of def?.steps ?? []) {
      if (step.step !== "branch") continue;
      for (const nested of step.steps ?? []) {
        if (nested.step === "action" && nested.tool === "GMAIL_SEND_EMAIL") {
          expect(nested.approval).toBe("ask");
        }
      }
    }
  });

  it("drafts per candidate (draft forEach)", () => {
    const draft = result.definition?.steps?.find((s) => s.step === "draft");
    expect(draft?.step === "draft" && draft.forEach).toBe("candidates");
  });
});
