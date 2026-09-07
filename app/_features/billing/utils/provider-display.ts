import type { BillingOrigin, BillingProvider } from "../data";
import type { SourceKind } from "@/app/_lib/demo/people-demo-data";

export type BillingProviderDisplay = {
  label: string;
  iconSrc?: string;
  color: string;
};

export const BILLING_PROVIDER_DISPLAY: Record<BillingProvider, BillingProviderDisplay> = {
  stripe: {
    label: "Stripe",
    iconSrc: "/connectors/stripe.png",
    color: "#635BFF",
  },
  quickbooks: {
    label: "QuickBooks",
    iconSrc: "/connectors/quickbooks.png",
    color: "#2CA01C",
  },
  square: {
    label: "Square",
    iconSrc: "/connectors/square.png",
    color: "#000000",
  },
  shopify: {
    label: "Shopify",
    iconSrc: "/connectors/shopify.png",
    color: "#96BF48",
  },
  lemonsqueezy: {
    label: "Lemon Squeezy",
    iconSrc: "/connectors/lemon-squeezy.png",
    color: "#FFC233",
  },
  mercury: {
    label: "Mercury",
    iconSrc: "/connectors/mercury.png",
    color: "#5C54FF",
  },
  manual: {
    label: "Added by user",
    color: "#0F172A",
  },
};

export function getBillingProviderDisplay(provider: BillingProvider): BillingProviderDisplay {
  return BILLING_PROVIDER_DISPLAY[provider];
}

/**
 * Full source attribution for a billing record. `provider` alone cannot tell
 * "user added this" from "Salt found this in email" — both are provider
 * "manual". Salt-authored rows carry origin "found" and/or source
 * "salt_inferred"; the user's "Added manually" reclassification always wins.
 */
export type BillingSourceAttribution = {
  provider: BillingProvider;
  source?: SourceKind;
  origin?: BillingOrigin;
  sourceReclassifiedAsManual?: boolean;
};

export type BillingSourceDisplay = BillingProviderDisplay & {
  /** True when Salt (not the user, not a synced app) added the record. */
  isSalt: boolean;
};

export function getBillingSourceDisplay(attr: BillingSourceAttribution): BillingSourceDisplay {
  if (attr.provider !== "manual") {
    return { ...getBillingProviderDisplay(attr.provider), isSalt: false };
  }
  const addedBySalt =
    !attr.sourceReclassifiedAsManual &&
    (attr.origin === "found" || attr.source === "salt_inferred");
  if (addedBySalt) {
    return { label: "Added by Salt", color: "#F97316", isSalt: true };
  }
  return { ...BILLING_PROVIDER_DISPLAY.manual, isSalt: false };
}
