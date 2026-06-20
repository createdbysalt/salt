export type BrandfetchLogoPreset = "hub-mark" | "article-mark";
export type BrandfetchLogoType = "icon" | "symbol" | "logo";
export type BrandfetchLogoTheme = "light" | "dark";

/** Preferred mark types for compare cards: symbol → logo → icon (icons often ship on solid tiles). */
export const COMPARE_LOGO_TYPE_PRIORITY: BrandfetchLogoType[] = [
  "symbol",
  "logo",
  "icon",
];

/** Logo API CDN URL — embed in `<img>` only (browser Referer); not for server-side fetch. */
export function buildBrandfetchLogoCdnUrl(
  domain: string,
  preset: BrandfetchLogoPreset = "hub-mark",
  type: BrandfetchLogoType = "icon",
  theme: BrandfetchLogoTheme = "light"
): string | null {
  const clientId =
    process.env.BRANDFETCH_CLIENT_ID ??
    process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

  if (!clientId || !domain) {
    return null;
  }

  const encodedDomain = encodeURIComponent(domain);
  const client = encodeURIComponent(clientId);
  const height = preset === "hub-mark" ? 64 : 36;
  // icon defaults to Brandfetch's own logo on miss — use 404 so we can fall through
  const fallbackSegment = type === "icon" ? "fallback/404/" : "";

  return `https://cdn.brandfetch.io/${encodedDomain}/h/${height}/theme/${theme}/${fallbackSegment}type/${type}.png?c=${client}`;
}

export function buildBrandfetchLogoCandidates(
  domains: string[],
  preset: BrandfetchLogoPreset = "hub-mark",
  types: BrandfetchLogoType[] = COMPARE_LOGO_TYPE_PRIORITY
): string[] {
  const candidates: string[] = [];

  for (const domain of domains) {
    for (const type of types) {
      const url = buildBrandfetchLogoCdnUrl(domain, preset, type);
      if (url) {
        candidates.push(url);
      }
    }
  }

  return candidates;
}
