import { describe, expect, it } from "vitest";
import type { BillingProvider } from "../data";
import { BILLING_PROVIDER_DISPLAY, getBillingProviderDisplay } from "./provider-display";

describe("billing provider display", () => {
  it("covers every supported billing provider", () => {
    const providers: BillingProvider[] = [
      "stripe",
      "quickbooks",
      "square",
      "shopify",
      "lemonsqueezy",
      "mercury",
      "manual",
    ];

    expect(Object.keys(BILLING_PROVIDER_DISPLAY).sort()).toEqual([...providers].sort());
  });

  it("returns connector icon metadata for finance apps", () => {
    expect(getBillingProviderDisplay("stripe")).toMatchObject({
      label: "Stripe",
      iconSrc: "/connectors/stripe.png",
    });
    expect(getBillingProviderDisplay("quickbooks")).toMatchObject({
      label: "QuickBooks",
      iconSrc: "/connectors/quickbooks.png",
    });
  });

  it("keeps manual records displayable without a connector icon", () => {
    expect(getBillingProviderDisplay("manual")).toEqual({
      label: "Added by user",
      color: "#0F172A",
    });
  });
});
