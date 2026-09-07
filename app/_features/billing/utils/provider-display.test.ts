import { describe, expect, it } from "vitest";
import type { BillingProvider } from "../data";
import {
  BILLING_PROVIDER_DISPLAY,
  getBillingProviderDisplay,
  getBillingSourceDisplay,
} from "./provider-display";

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

describe("getBillingSourceDisplay", () => {
  it("shows the connector for synced records regardless of source flags", () => {
    expect(getBillingSourceDisplay({ provider: "stripe", origin: "found" })).toMatchObject({
      label: "Stripe",
      isSalt: false,
    });
  });

  it("attributes Salt-found records (origin found, provider manual) to Salt", () => {
    expect(
      getBillingSourceDisplay({ provider: "manual", origin: "found", source: "salt_inferred" }),
    ).toMatchObject({ label: "Added by Salt", isSalt: true });
  });

  it("attributes salt_inferred records still marked origin added to Salt", () => {
    expect(
      getBillingSourceDisplay({ provider: "manual", origin: "added", source: "salt_inferred" }),
    ).toMatchObject({ label: "Added by Salt", isSalt: true });
  });

  it("keeps genuine user-added records as Added by user", () => {
    expect(
      getBillingSourceDisplay({ provider: "manual", origin: "added", source: "user" }),
    ).toMatchObject({ label: "Added by user", isSalt: false });
  });

  it("honors the user's Added manually reclassification over Salt attribution", () => {
    expect(
      getBillingSourceDisplay({
        provider: "manual",
        origin: "found",
        source: "salt_inferred",
        sourceReclassifiedAsManual: true,
      }),
    ).toMatchObject({ label: "Added by user", isSalt: false });
  });
});
