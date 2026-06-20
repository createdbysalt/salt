import type { BlogPost, Category } from "./types";

function isCanonicalSanityId(id: string, prefix: string): boolean {
  return id.startsWith(`${prefix}-`);
}

function isCompareOrGuideArticle(post: BlogPost): boolean {
  return post.articleKind === "comparison" || post.articleKind === "guide";
}

function blogPostScore(post: BlogPost): number {
  let score = 0;
  if (isCanonicalSanityId(post._id, "blogPost")) score += 100;
  if (isCompareOrGuideArticle(post) && isCanonicalSanityId(post._id, "compare")) {
    score += 100;
  }
  if (post.featuredImage?.asset) score += 10;
  if (post.keyTakeaways?.length) score += 5;
  if (post.body?.length) score += Math.min(post.body.length, 20);
  if (post.updatedAt) score += 1;
  return score;
}

export function pickPreferredBlogPost(a: BlogPost, b: BlogPost): BlogPost {
  const scoreA = blogPostScore(a);
  const scoreB = blogPostScore(b);
  if (scoreA !== scoreB) return scoreA > scoreB ? a : b;
  return a.publishedAt >= b.publishedAt ? a : b;
}

/** Collapse duplicate Sanity blogPost docs that share a slug (orphan + seeded). */
export function dedupeBlogPostsBySlug(posts: BlogPost[]): BlogPost[] {
  const bySlug = new Map<string, BlogPost>();

  for (const post of posts) {
    const slug = post.slug?.current;
    if (!slug) continue;

    const existing = bySlug.get(slug);
    bySlug.set(slug, existing ? pickPreferredBlogPost(existing, post) : post);
  }

  return [...bySlug.values()];
}

function categoryScore(category: Category): number {
  let score = 0;
  if (isCanonicalSanityId(category._id, "category")) score += 100;
  if (category.description) score += 5;
  if (category.titleShort) score += 2;
  if (typeof category.sortOrder === "number") score += 1;
  return score;
}

export function pickPreferredCategory(a: Category, b: Category): Category {
  const scoreA = categoryScore(a);
  const scoreB = categoryScore(b);
  if (scoreA !== scoreB) return scoreA > scoreB ? a : b;
  return (a.sortOrder ?? 99) <= (b.sortOrder ?? 99) ? a : b;
}

/** Collapse duplicate Sanity category docs that share a route slug. */
export function dedupeCategoriesByRouteSlug(categories: Category[]): Category[] {
  const bySlug = new Map<string, Category>();

  for (const category of categories) {
    const slug = category.slug?.current;
    if (!slug) continue;

    const existing = bySlug.get(slug);
    bySlug.set(slug, existing ? pickPreferredCategory(existing, category) : category);
  }

  return [...bySlug.values()];
}

export type ResolvedBlogCategoryLike = {
  routeSlug: string;
  title: string;
  titleShort?: string;
  description: string;
  sortOrder: number;
};

function resolvedCategoryScore(category: ResolvedBlogCategoryLike): number {
  let score = 0;
  if (category.description.trim()) score += 5;
  if (category.titleShort?.trim()) score += 2;
  if (category.sortOrder > 0) score += 1;
  return score;
}

/** Final guard: one nav chip per public route slug. */
export function dedupeResolvedBlogCategories<T extends ResolvedBlogCategoryLike>(
  categories: T[]
): T[] {
  const byRoute = new Map<string, T>();

  for (const category of categories) {
    const existing = byRoute.get(category.routeSlug);
    if (!existing) {
      byRoute.set(category.routeSlug, category);
      continue;
    }

    const keep =
      resolvedCategoryScore(existing) >= resolvedCategoryScore(category)
        ? existing
        : category;
    byRoute.set(category.routeSlug, keep);
  }

  return [...byRoute.values()];
}
