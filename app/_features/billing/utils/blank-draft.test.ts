import { describe, expect, it } from "vitest";
import { buildBlankBillingDraft } from "./blank-draft";

describe("buildBlankBillingDraft", () => {
  it("builds a valid receivable draft", () => {
    const draft = buildBlankBillingDraft("receivable");
    expect(draft.direction).toBe("receivable");
    expect(draft.number.startsWith("INV-")).toBe(true);
    expect(draft.amountCents).toBeGreaterThan(0);
    expect(draft.org?.name).toBe("Unmatched customer");
  });

  it("builds a valid payable draft", () => {
    const draft = buildBlankBillingDraft("payable");
    expect(draft.direction).toBe("payable");
    expect(draft.number.startsWith("BILL-")).toBe(true);
    expect(draft.vendorLabel).toBe("Unmatched vendor");
  });
});
