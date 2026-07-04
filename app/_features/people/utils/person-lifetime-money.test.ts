import { describe, expect, it } from "vitest";
import {
  getPersonLifetimeMoneyLabel,
  getPersonMoneyFlow,
  resolvePersonLifetimeMoneyCents,
  sumPaidInvoiceCents,
} from "./person-lifetime-money";

describe("getPersonMoneyFlow", () => {
  it("maps client-side relationships to receivable", () => {
    expect(getPersonMoneyFlow("client")).toBe("receivable");
    expect(getPersonMoneyFlow("past_client")).toBe("receivable");
    expect(getPersonMoneyFlow("prospect")).toBe("receivable");
    expect(getPersonMoneyFlow("lead")).toBe("receivable");
  });

  it("maps vendor-side relationships to payable", () => {
    expect(getPersonMoneyFlow("vendor")).toBe("payable");
    expect(getPersonMoneyFlow("partner")).toBe("payable");
  });

  it("hides money flow for non-commercial relationships", () => {
    expect(getPersonMoneyFlow("team")).toBe("none");
    expect(getPersonMoneyFlow("personal")).toBe("none");
  });
});

describe("getPersonLifetimeMoneyLabel", () => {
  it("uses relationship-aware labels", () => {
    expect(getPersonLifetimeMoneyLabel("receivable")).toBe("Lifetime revenue");
    expect(getPersonLifetimeMoneyLabel("payable")).toBe("Total paid");
  });
});

describe("resolvePersonLifetimeMoneyCents", () => {
  it("sums paid demo invoices for receivable relationships", () => {
    expect(
      resolvePersonLifetimeMoneyCents({
        flow: "receivable",
        invoices: [
          { id: "1", number: "A", amountCents: 100_00, status: "paid", dueAt: "" },
          { id: "2", number: "B", amountCents: 50_00, status: "due", dueAt: "" },
        ],
      }),
    ).toBe(100_00);
  });

  it("prefers server lifetime revenue over demo invoices", () => {
    expect(
      resolvePersonLifetimeMoneyCents({
        flow: "receivable",
        lifetimeRevenueCents: 250_00,
        invoices: [{ id: "1", number: "A", amountCents: 100_00, status: "paid", dueAt: "" }],
      }),
    ).toBe(250_00);
  });

  it("returns payable totals for vendors and partners", () => {
    expect(
      resolvePersonLifetimeMoneyCents({
        flow: "payable",
        totalPaidCents: 420_00,
      }),
    ).toBe(420_00);
  });
});

describe("sumPaidInvoiceCents", () => {
  it("ignores unpaid invoices", () => {
    expect(
      sumPaidInvoiceCents([
        { id: "1", number: "A", amountCents: 200_00, status: "paid", dueAt: "" },
        { id: "2", number: "B", amountCents: 300_00, status: "paid", dueAt: "" },
      ]),
    ).toBe(500_00);
  });
});
