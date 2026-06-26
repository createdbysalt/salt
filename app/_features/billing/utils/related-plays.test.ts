import { describe, expect, it } from "vitest";
import type { BillingRecord } from "../data";
import {
  buildBillingPlayOrFilter,
  normalizeBillingPlaySearchTerm,
} from "./related-plays";

const baseRecord: BillingRecord = {
  id: "billing-1",
  direction: "payable",
  number: "INV-1",
  amountCents: 1000,
  currency: "USD",
  status: "due",
  dueAt: "2026-06-30T12:00:00.000Z",
  issuedAt: "2026-06-01T12:00:00.000Z",
  lineItems: [],
  activity: [],
  source: "user",
  provider: "manual",
  origin: "added",
  tags: [],
};

describe("normalizeBillingPlaySearchTerm", () => {
  it("removes punctuation that would break PostgREST logic-tree parsing", () => {
    expect(normalizeBillingPlaySearchTerm("Anthropic, Inc.")).toBe("Anthropic");
  });

  it("returns null when no searchable token remains", () => {
    expect(normalizeBillingPlaySearchTerm(",")).toBeNull();
  });
});

describe("buildBillingPlayOrFilter", () => {
  it("builds a recipient filter without raw commas from the party label", () => {
    expect(buildBillingPlayOrFilter(baseRecord, "Anthropic, Inc.")).toBe(
      "recipient_label.ilike.%Anthropic%",
    );
  });

  it("includes entity filters with the sanitized recipient fallback", () => {
    const record: BillingRecord = {
      ...baseRecord,
      org: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Anthropic",
      },
    };

    expect(buildBillingPlayOrFilter(record, "Anthropic, Inc.")).toBe(
      "and(target_type.eq.organization,target_id.eq.00000000-0000-0000-0000-000000000001),recipient_label.ilike.%Anthropic%",
    );
  });
});
