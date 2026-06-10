import { describe, expect, it } from "vitest";
import {
  isAllowedLegacyCheckoutPriceId,
  resolveLegacyCheckoutPriceId,
} from "./checkout-allowlist";

describe("checkout-allowlist", () => {
  it("resolves known plan keys to configured price IDs", () => {
    const starter = resolveLegacyCheckoutPriceId("starter");
    const advanced = resolveLegacyCheckoutPriceId("advanced");

    expect(starter).toBeTruthy();
    expect(advanced).toBeTruthy();
    expect(isAllowedLegacyCheckoutPriceId(starter!)).toBe(true);
  });

  it("rejects tampered price IDs", () => {
    expect(resolveLegacyCheckoutPriceId("evil-plan")).toBeNull();
    expect(isAllowedLegacyCheckoutPriceId("price_attacker")).toBe(false);
  });
});
