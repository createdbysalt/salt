/**
 * Fallback image for JSON-LD / social previews only.
 * The compare hero renders `CompareHeroWorkspacePreview` (frozen desktop HQ demo, scaled on mobile).
 */
export const DEFAULT_COMPARE_HERO_IMAGE = {
  src: "/landing/hq-workspace.png",
  alt: "Salt HQ dashboard showing proactive plays ready for approval",
} as const;

const SLUG_HERO_OVERRIDES: Partial<
  Record<string, { src: string; alt: string }>
> = {
  // "salt-vs-lindy": { src: "/compare/heroes/salt-vs-lindy.png", alt: "..." },
};

export function getCompareHeroImage(slug: string) {
  return SLUG_HERO_OVERRIDES[slug] ?? DEFAULT_COMPARE_HERO_IMAGE;
}
