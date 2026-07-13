import { describe, expect, it } from "vitest";
import {
  resolvePlaybookChatContract,
  readPlaybookIntakeSummary,
} from "./playbook-chat-contract";

describe("resolvePlaybookChatContract", () => {
  it("loads memory-records chat.yaml with inline execution and intake", () => {
    const contract = resolvePlaybookChatContract("memory-records");
    expect(contract).not.toBeNull();
    expect(contract?.execution).toBe("inline");
    expect(contract?.hasIntakeScript).toBe(true);
    expect(contract?.enrichment.required).toBe(true);
    expect(contract?.explicitIntentAuthorizesCreate).toBe(true);
    expect(contract?.askSaltTools).toContain("parse_intake");
    expect(contract?.askSaltTools).toContain("enrich_entity");
    expect(contract?.enrichmentCategories.length).toBeGreaterThan(0);
    expect(contract?.procedure.length).toBeGreaterThan(0);
  });

  it("returns null for unknown slug", () => {
    expect(resolvePlaybookChatContract("not-a-real-playbook-slug")).toBeNull();
  });
});

describe("readPlaybookIntakeSummary", () => {
  it("extracts intake section from memory-records PLAYBOOK.md", () => {
    const summary = readPlaybookIntakeSummary("memory-records");
    expect(summary).toContain("Intake System");
    expect(summary).toContain("Ask Salt");
  });
});
