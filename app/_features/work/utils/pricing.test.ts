import { describe, expect, it } from "vitest";
import { computeFinalPrice, formatWorkBillingLine } from "./pricing";

describe("computeFinalPrice", () => {
  it("applies percent discounts", () => {
    expect(computeFinalPrice(800_000, { type: "percent", percent: 20 })).toBe(640_000);
  });

  it("applies flat discounts", () => {
    expect(computeFinalPrice(800_000, { type: "amount", amountCents: 150_000 })).toBe(650_000);
  });

  it("clamps discounts to valid money values", () => {
    expect(computeFinalPrice(800_000, { type: "percent", percent: 150 })).toBe(0);
    expect(computeFinalPrice(800_000, { type: "amount", amountCents: 900_000 })).toBe(0);
    expect(computeFinalPrice(800_000, { type: "amount", amountCents: -100 })).toBe(800_000);
  });

  it("returns null when there is no base price", () => {
    expect(computeFinalPrice(null, { type: "percent", percent: 20 })).toBeNull();
  });
});

describe("formatWorkBillingLine", () => {
  const rollup = {
    invoiceCount: 2,
    invoicedCents: 300_000,
    collectedCents: 150_000,
    currency: "USD",
  };

  it("reconciles billed vs target with the remainder left to bill", () => {
    expect(formatWorkBillingLine(rollup, 500_000)).toBe(
      "Billed $3,000 of $5,000 · $1,500 collected · $2,000 left to bill",
    );
  });

  it("omits the target and remainder when the work has no price", () => {
    expect(formatWorkBillingLine(rollup, null)).toBe(
      "Billed $3,000 · $1,500 collected",
    );
  });

  it("omits the remainder once the target is fully billed", () => {
    expect(formatWorkBillingLine({ ...rollup, invoicedCents: 500_000 }, 500_000)).toBe(
      "Billed $5,000 of $5,000 · $1,500 collected",
    );
  });

  it("returns null when nothing has been invoiced", () => {
    expect(formatWorkBillingLine({ ...rollup, invoiceCount: 0 }, 500_000)).toBeNull();
  });
});
