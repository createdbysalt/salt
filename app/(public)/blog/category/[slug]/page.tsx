import { notFound } from "next/navigation";
import Script from "next/script";
import { BlogCategoryPage } from "@/app/_features/marketing/blog/BlogCategoryPage";
import {
  BLOG_CATEGORY_ROUTE_SLUGS,
  isBlogCategoryRouteSlug,
} from "@/app/_features/marketing/blog/blog-category-config";
import {
  resolveBlogCategoryPage,
} from "@/app/_features/marketing/blog/blog-category-data";
import {
  resolveBlogArticles,
} from "@/app/_features/marketing/blog/blog-article-data";
import {
  filterArticlesByCategory,
} from "@/app/_features/marketing/blog/blog-utils";
import { getBlogCategoryHref } from "@/app/_features/marketing/blog/blog-paths";
import { getSEOTags } from "@/app/_lib/seo";
import { buildBlogCategoryGraph } from "@/app/_lib/seo/blog-structured-data";
import config from "@/config";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return BLOG_CATEGORY_ROUTE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  if (!isBlogCategoryRouteSlug(slug)) return {};

  const category = await resolveBlogCategoryPage(slug);
  if (!category) return {};

  return getSEOTags({
    title: category.seo?.title ?? `${category.titleShort ?? category.title} | ${config.appName} Blog`,
    description: category.seo?.description ?? category.description,
    canonicalUrlRelative: getBlogCategoryHref(slug),
  });
}

export default async function BlogCategoryRoutePage({ params }: CategoryPageProps) {
  const { slug } = await params;

  if (!isBlogCategoryRouteSlug(slug)) {
    notFound();
  }

  const [category, allArticles] = await Promise.all([
    resolveBlogCategoryPage(slug),
    resolveBlogArticles(),
  ]);

  if (!category) {
    notFound();
  }

  const categoryArticles = filterArticlesByCategory(
    allArticles,
    category.legacySlug
  );

  const structuredData = buildBlogCategoryGraph({
    title: category.titleShort ?? category.title,
    description: category.description,
    routeSlug: slug,
    articles: categoryArticles,
  });

  return (
    <>
      <Script
        type="application/ld+json"
        id={`json-ld-category-${slug}`}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <BlogCategoryPage
        category={category}
        articles={categoryArticles}
      />
    </>
  );
}
