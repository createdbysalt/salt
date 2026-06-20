import type { HomepageContent } from "@/app/_lib/sanity/types";

/** Whether the animated workspace preview renders below the hero. Defaults to on. */
export function resolveHeroShowPreview(
  content?: HomepageContent | null
): boolean {
  return content?.heroShowPreview !== false;
}
