import { describe, expect, it } from "vitest";
import { buildManualBillingSourceExternalId, draftToInsertRow } from "./db-mapper";
import type { BillingRecordDraft } from "../actions/billing-record-draft";

const sampleDraft: BillingRecordDraft = {
  direction: "receivable",
  number: "INV-2026-6166",
  amountCents: 250_000,
  currency: "USD",
  status: "draft",
  dueAt: "2026-07-15T12:00:00.000Z",
  org: { id: "pending", name: "Acme Studio" },
  lineItems: [{ description: "Website build", amountCents: 250_000 }],
  tags: ["ask-salt"],
};

describe("manual billing source ids", () => {
  it("builds a stable lowercase source id from direction and number", () => {
    expect(
      buildManualBillingSourceExternalId({
        direction: "receivable",
        number: "INV-2026-6166",
      }),
    ).toBe("manual:receivable:inv-2026-6166");
  });

  it("includes source_external_id on manual insert rows", () => {
    const row = draftToInsertRow({
      workspaceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      draft: sampleDraft,
    });

    expect(row.source_external_id).toBe("manual:receivable:inv-2026-6166");
  });
});
