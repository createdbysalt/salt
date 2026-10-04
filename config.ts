/**
 * Site-wide configuration used by SEO helpers, auth redirects, and email senders.
 * Billing tiers and prices live in `app/_lib/usage/pricing-versions.ts`, not here.
 */
export interface AppConfig {
  appName: string;
  appDescription: string;
  /** Naked production domain, no scheme or trailing slash. */
  domainName: string;
  gleap: {
    /** Gleap support widget key; empty disables the widget. */
    apiKey: string;
  };
  stripe: {
    /** Legacy one-time plans kept for the checkout allowlist; live tiers come from the pricing catalog. */
    plans: { planKey: "starter" | "advanced"; priceId: string; name: string }[];
  };
  resend: {
    fromNoReply: string;
    fromAdmin: string;
    supportEmail: string;
  };
  colors: {
    /** Primary brand color for the theme-color meta tag; matches `app/manifest.ts`. */
    main: string;
  };
  auth: {
    /** Where unauthenticated users are sent. */
    loginUrl: string;
    /** Where users land after sign-in. */
    callbackUrl: string;
  };
}

const config: AppConfig = {
  appName: "Salt",
  appDescription:
    "The proactive AI for your business. Salt learns from connected accounts, prepares what's next, and you approve what grows.",
  domainName: "usesalt.io",
  gleap: {
    apiKey: process.env.NEXT_PUBLIC_GLEAP_API_KEY || "",
  },
  stripe: {
    plans: [
      { planKey: "starter", priceId: process.env.STRIPE_LEGACY_STARTER_PRICE_ID || "price_legacy_starter", name: "Starter" },
      { planKey: "advanced", priceId: process.env.STRIPE_LEGACY_ADVANCED_PRICE_ID || "price_legacy_advanced", name: "Advanced" },
    ],
  },
  resend: {
    fromNoReply: process.env.RESEND_FROM_EMAIL || "Salt <noreply@usesalt.io>",
    fromAdmin: process.env.RESEND_FROM_EMAIL || "Salt <notifications@usesalt.io>",
    supportEmail: "support@usesalt.io",
  },
  colors: {
    main: "#00949f",
  },
  auth: {
    loginUrl: "/signin",
    callbackUrl: "/hq",
  },
};

export default config;
