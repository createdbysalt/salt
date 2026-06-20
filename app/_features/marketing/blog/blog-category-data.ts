import type { Category } from "@/app/_lib/sanity/types";
import { getAllCategories, getCategoryBySlug } from "@/app/_lib/sanity/queries";
import {
  getLegacyCategorySlug,
  isBlogCategoryRouteSlug,
  type BlogCategoryRouteSlug,
} from "./blog-category-config";
import { dedupeCategoriesByRouteSlug, dedupeResolvedBlogCategories } from "@/app/_lib/sanity/blog-dedupe";

export type ResolvedBlogCategory = {
  routeSlug: BlogCategoryRouteSlug;
  legacySlug: string;
  title: string;
  titleShort?: string;
  description: string;
  sortOrder: number;
  seo?: Category["seo"];
};

function fromSanity(doc: Category): ResolvedBlogCategory | null {
  const routeSlug = doc.slug?.current;
  if (!routeSlug || !isBlogCategoryRouteSlug(routeSlug)) return null;

  return {
    routeSlug,
    legacySlug:
      doc.legacyArticleSlug ?? getLegacyCategorySlug(routeSlug) ?? routeSlug,
    title: doc.title,
    titleShort: doc.titleShort,
    description: doc.description ?? "",
    sortOrder: doc.sortOrder ?? 0,
    seo: doc.seo,
  };
}

/** Nav + hub: Sanity categories only. */
export async function resolveBlogCategories(): Promise<ResolvedBlogCategory[]> {
  const docs = dedupeCategoriesByRouteSlug(await getAllCategories());
  const resolved = docs
    .map(fromSanity)
    .filter((item): item is ResolvedBlogCategory => item !== null);

  return dedupeResolvedBlogCategories(resolved).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/** Category landing page: single category by public route slug. */
export async function resolveBlogCategoryPage(
  routeSlug: string
): Promise<ResolvedBlogCategory | null> {
  if (!isBlogCategoryRouteSlug(routeSlug)) return null;

  const doc = await getCategoryBySlug(routeSlug);
  if (!doc) return null;

  return fromSanity(doc);
}

export function resolveLegacySlugFromRoute(routeSlug: string): string | null {
  return getLegacyCategorySlug(routeSlug);
}
