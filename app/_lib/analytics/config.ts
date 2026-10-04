/** Canonical tracking IDs — override via env when set in Vercel / 1Password. */
const DEFAULT_GTM_ID = "GTM-PP88BWLJ";
const DEFAULT_POSTHOG_KEY = "";
const DEFAULT_META_PIXEL_ID = "4225942947736078";

export const analyticsConfig = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID ?? DEFAULT_GTM_ID,
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? DEFAULT_POSTHOG_KEY,
  posthogUiHost: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? DEFAULT_META_PIXEL_ID,
  metaCapiToken: process.env.META_CAPI_TOKEN,
} as const;
