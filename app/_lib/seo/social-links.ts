/**
 * Canonical Salt social handles and profile URLs.
 * Handle: X @usesaltapp; @usesalt.io on most other platforms; Reddit @usesaltio; YouTube @usesalt.
 */

/** Public marketing site — use in AEO/llms content and citations (never localhost). */
export const SALT_MARKETING_URL = "https://usesalt.io" as const;

/** Production marketing origin for llms.txt / llm-info; maps dev hosts to usesalt.io. */
export function resolvePublicMarketingUrl(candidate?: string): string {
  if (!candidate) return SALT_MARKETING_URL;

  try {
    const { hostname } = new URL(candidate);
    const isLocal =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".lvh.me") ||
      hostname === "127.0.0.1";

    return isLocal ? SALT_MARKETING_URL : candidate.replace(/\/$/, "");
  } catch {
    return SALT_MARKETING_URL;
  }
}

export const SALT_SOCIAL = {
  handle: "usesalt.io",
  xHandle: "usesaltapp",
  redditHandle: "usesaltio",
  x: "https://x.com/usesaltapp",
  linkedin: "https://www.linkedin.com/company/usesalt.io",
  instagram: "https://www.instagram.com/usesalt.io",
  youtube: "https://www.youtube.com/@usesalt",
  github: "https://github.com/usesalt.io",
  reddit: "https://www.reddit.com/r/usesaltio",
} as const;

/** JSON-LD sameAs — public profiles for Organization schema. */
export const SALT_SOCIAL_SAME_AS: readonly string[] = [
  SALT_SOCIAL.x,
  SALT_SOCIAL.linkedin,
  SALT_SOCIAL.instagram,
  SALT_SOCIAL.youtube,
  SALT_SOCIAL.github,
  SALT_SOCIAL.reddit,
];
