import { describe, expect, it } from "vitest";
import { extractBillingDraftFromToolOutput } from "./billing-draft-utils";

describe("extractBillingDraftFromToolOutput", () => {
  it("returns a validated draft from add_billing_record output", () => {
    const draft = extractBillingDraftFromToolOutput({
      drafted: true,
      draft: {
        direction: "receivable",
        number: "INV-2026-1200",
        amountCents: 480000,
        currency: "USD",
        status: "draft",
        dueAt: "2026-07-07T12:00:00.000Z",
        org: { id: "pending", name: "Northwind Studio" },
        lineItems: [{ description: "Marketing site relaunch", amountCents: 480000 }],
        tags: ["ask-salt", "draft"],
        extraction: {
          confidence: 88,
          needsReview: ["dueAt"],
          sourceDocId: "ask-salt",
        },
      },
      message: "Draft ready for review.",
    });

    expect(draft?.number).toBe("INV-2026-1200");
    expect(draft?.org?.name).toBe("Northwind Studio");
  });

  it("returns null for unrelated tool output", () => {
    expect(extractBillingDraftFromToolOutput({ ok: true })).toBeNull();
  });
});
