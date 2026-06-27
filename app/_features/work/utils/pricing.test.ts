import { describe, expect, it } from "vitest";
import { computeFinalPrice } from "./pricing";

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
