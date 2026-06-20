export const HERO_PREVIEW_VISUAL_KEYS = ["workspace-demo"] as const;

export type HeroPreviewVisualKey = (typeof HERO_PREVIEW_VISUAL_KEYS)[number];

export const HERO_PREVIEW_VISUAL_FALLBACK: HeroPreviewVisualKey = "workspace-demo";

export function resolveHeroPreviewVisualKey(
  value?: string | null
): HeroPreviewVisualKey {
  if (value && HERO_PREVIEW_VISUAL_KEYS.includes(value as HeroPreviewVisualKey)) {
    return value as HeroPreviewVisualKey;
  }
  return HERO_PREVIEW_VISUAL_FALLBACK;
}
