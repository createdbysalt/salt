import { BlogSearchPage } from "@/app/_features/marketing/blog/BlogSearchPage";
import { resolveBlogArticles } from "@/app/_features/marketing/blog/blog-article-data";
import {
  isBlogCategoryRouteSlug,
} from "@/app/_features/marketing/blog/blog-category-config";
import { resolveBlogCategories } from "@/app/_features/marketing/blog/blog-category-data";
import { getBlogSearchHref } from "@/app/_features/marketing/blog/blog-paths";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

type BlogSearchRouteProps = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

export async function generateMetadata({ searchParams }: BlogSearchRouteProps) {
  const { q } = await searchParams;
  const trimmed = q?.trim();

  return getSEOTags({
    title: trimmed
      ? `Search: ${trimmed} | ${config.appName} Blog`
      : `Search | ${config.appName} Blog`,
    description: trimmed
      ? `Search results for "${trimmed}" on the ${config.appName} blog.`
      : `Search the ${config.appName} blog for articles on proactive AI, business, and tutorials.`,
    canonicalUrlRelative: getBlogSearchHref(trimmed),
    extraTags: {
      robots: "noindex, follow",
    },
  });
}

export default async function BlogSearchRoute({ searchParams }: BlogSearchRouteProps) {
  const { q, category } = await searchParams;
  const categoryRouteSlug =
    category && isBlogCategoryRouteSlug(category) ? category : null;

  const [articles, categories] = await Promise.all([
    resolveBlogArticles(),
    resolveBlogCategories(),
  ]);

  return (
    <BlogSearchPage
      query={q ?? ""}
      categoryRouteSlug={categoryRouteSlug}
      categories={categories}
      articles={articles}
    />
  );
}
