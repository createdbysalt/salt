import { describe, expect, it } from "vitest";
import {
  buildKeeperCardDisplay,
  buildKeeperProfileFindingCopy,
  isActionableKeeperProfileResult,
  keeperPlaybookDisplayName,
} from "./keeper-profile-display";
import type { ProfileFieldResult } from "./types";

function result(overrides: Partial<ProfileFieldResult> = {}): ProfileFieldResult {
  return {
    field: "relationship_type",
    value: "client",
    confidence: 82,
    because: "Payment received from this contact",
    source: "rule",
    ruleId: "rel-payment-client",
    status: "pending",
    evidence: {},
    ...overrides,
  };
}

describe("keeper profile display", () => {
  it("maps memory-records slug to Memory Records", () => {
    expect(keeperPlaybookDisplayName("memory-records")).toBe("Memory Records");
  });

  it("maps legacy keeper slugs to Memory Records for backward compatibility", () => {
    expect(keeperPlaybookDisplayName("keeper-people-records")).toBe("Memory Records");
    expect(keeperPlaybookDisplayName("keeper-organizations-records")).toBe("Memory Records");
    expect(keeperPlaybookDisplayName("keeper-work-records")).toBe("Memory Records");
  });

  it("uses human titles for relationship suggestions", () => {
    const copy = buildKeeperProfileFindingCopy({
      field: "relationship_type",
      result: result(),
      targetLabel: "Matheus Martins",
      blueprintSlug: "memory-records",
    });

    expect(copy.title).toBe("Mark Matheus Martins as Client");
    expect(copy.primaryAction).toBe("Save as Client");
    expect(copy.content).toContain("Payment received");
  });

  it("rejects unknown relationship suggestions", () => {
    expect(
      isActionableKeeperProfileResult(result({ value: "unknown", source: "ai_fallback" })),
    ).toBe(false);
  });

  it("builds card display for existing findings", () => {
    const display = buildKeeperCardDisplay({
      findingTitle: "Review relationship for Memory",
      findingContent: "Review relationship: unknown.",
      blueprintSlug: "memory-records",
      field: "relationship_type",
      value: "client",
      because: "Invoice paid last month",
      targetLabel: "Matheus Martins",
    });

    expect(display.playbookName).toBe("Memory Records");
    expect(display.title).toBe("Mark Matheus Martins as Client");
    expect(display.primaryAction).toBe("Save as Client");
  });
});
