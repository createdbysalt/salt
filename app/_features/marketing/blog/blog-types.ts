import type { articleType } from "@/app/(public)/learn/_assets/content";
import type { BlogExcerptParts } from "./blog-display-text";

export type { articleType, categoryType, authorType } from "@/app/(public)/learn/_assets/content";

/** Article resolved from Sanity with optional SEO overrides (excerpt stays on `description`). */
export type BlogArticle = articleType & {
  dek?: BlogExcerptParts;
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
  noIndex?: boolean;
};
