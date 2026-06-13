/** Canonical marketing wordmark — same asset as landing2 nav/footer (`salt-logo.svg`). */
export const SALT_WORDMARK_PATH = "/salt-logo.svg";

/**
 * Email-safe PNG wordmarks — SVG + CSS masks are blocked in Gmail, Outlook, and iCloud.
 * Generated from `salt-logo.svg` (landing2 nav wordmark) via sharp.
 */
export const SALT_EMAIL_WORDMARK_PATHS = {
  white: "/salt-logo-email-white.png",
  ink: "/salt-logo-email-ink.png",
} as const;

/** CID for inline PNG attachment — survives iCloud/Gmail remote-image blocking. */
export const SALT_EMAIL_WORDMARK_CID = "salt-wordmark";

/** Wordmark aspect ratio from `salt-logo.svg` viewBox (697.15 × 294.41). */
export const SALT_EMAIL_WORDMARK_ASPECT = 294.41 / 697.15;

/** Landing2 palette (hex approximations of oklch tokens in landing2.css). */
export const MARKETING_EMAIL_COLORS = {
  ink: "#1a1a1a",
  cream: "#f6f3ec",
  sand: "#ebe6dc",
  cardTint: "#f0ece4",
  muted: "#5c5c5c",
  mutedLight: "#7a7a7a",
  border: "#e0dbd2",
  card: "#ffffff",
  link: "#00949f",
  auroraDeep: "#2a5f56",
  auroraMid: "#3a8fa3",
  auroraWarm: "#e2c078",
} as const;

/** Vertical aurora hero — teal into warm sand (landing2 surface-aurora, editorial). */
export const MARKETING_AURORA_GRADIENT_VERTICAL =
  "linear-gradient(180deg, #2a5f56 0%, #3a8fa3 42%, #d9bc7a 100%)";

/** Diagonal accent for chips and rules */
export const MARKETING_AURORA_GRADIENT =
  "linear-gradient(135deg, #2d6b5c 0%, #3d9ab0 40%, #e8c66a 100%)";

export const MARKETING_EMAIL_FONTS = {
  display:
    "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export function saltWordmarkImgHtml(
  siteUrl: string,
  options?: {
    variant?: "ink" | "white";
    width?: number;
    /** When set, references an inline attachment (`cid:`) instead of a remote URL. */
    inlineCid?: string;
  }
): string {
  const variant = options?.variant ?? "ink";
  const width = options?.width ?? 52;
  const path =
    variant === "white"
      ? SALT_EMAIL_WORDMARK_PATHS.white
      : SALT_EMAIL_WORDMARK_PATHS.ink;
  const height = Math.round(width * SALT_EMAIL_WORDMARK_ASPECT);
  const logoUrl = options?.inlineCid
    ? `cid:${options.inlineCid}`
    : `${siteUrl.replace(/\/$/, "")}${path}`;

  return `<img src="${logoUrl}" alt="Salt" width="${width}" height="${height}" style="display: block; width: ${width}px; height: auto; max-height: ${height}px; border: 0;" />`;
}
