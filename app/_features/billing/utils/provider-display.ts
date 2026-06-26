import type { BillingProvider } from "../data";

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
