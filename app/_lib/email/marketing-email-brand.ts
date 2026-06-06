/** Canonical marketing wordmark — same asset as landing2 nav/footer (`salt-logo.svg`). */
export const SALT_WORDMARK_PATH = "/salt-logo.svg";

/**
 * Email-safe PNG wordmarks — SVG + CSS filters are blocked in Gmail, Outlook, and iCloud.
 * Generated from `salt-logo-white.svg` / `salt-logo-black.svg` via sharp (see repo scripts).
 */
export const SALT_EMAIL_WORDMARK_PATHS = {
  white: "/salt-logo-email-white.png",
  ink: "/salt-logo-email-ink.png",
} as const;

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
  link: "#2A77E8",
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
  options?: { variant?: "ink" | "white"; width?: number }
): string {
  const variant = options?.variant ?? "ink";
  const width = options?.width ?? 52;
  const path =
    variant === "white"
      ? SALT_EMAIL_WORDMARK_PATHS.white
      : SALT_EMAIL_WORDMARK_PATHS.ink;
  // White PNG is ~2:1; ink PNG is ~5:1 (wordmark aspect ratios from source SVGs).
  const height = Math.round(width * (variant === "white" ? 0.51 : 0.2));
  const logoUrl = `${siteUrl.replace(/\/$/, "")}${path}`;

  return `<img src="${logoUrl}" alt="Salt" width="${width}" height="${height}" style="display: block; width: ${width}px; height: auto; max-height: ${height}px; border: 0;" />`;
}
