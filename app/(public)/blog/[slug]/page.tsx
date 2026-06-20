import { notFound } from "next/navigation";
import { BlogArticlePage } from "@/app/_features/marketing/blog/BlogArticlePage";
import { BlogArticleView } from "@/app/_features/marketing/blog/BlogArticleView";
import {
  resolveBlogArticle,
  resolveBlogArticles,
} from "@/app/_features/marketing/blog/blog-article-data";
import { toAbsoluteBlogImageUrl } from "@/app/_features/marketing/blog/blog-image-url";
import { resolveRelatedBlogArticles } from "@/app/_features/marketing/blog/blog-article-related";
import { getBlogArticleHref } from "@/app/_features/marketing/blog/blog-paths";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await resolveBlogArticles().then((articles) =>
    articles.map((article) => ({ slug: article.slug }))
  );
  return slugs;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await resolveBlogArticle(slug);

  if (!article) {
    return getSEOTags({ title: "Article Not Found" });
  }

  const modified = article.updatedAt ?? article.publishedAt;
  const pageTitle = article.metaTitle ?? `${article.title} | ${config.appName} Blog`;
  const ogDescription = article.metaDescription ?? article.description;
  const ogImage = toAbsoluteBlogImageUrl(
    article.metaImage ?? article.image.urlRelative
  );

  return getSEOTags({
    title: pageTitle,
    description: ogDescription,
    canonicalUrlRelative: getBlogArticleHref(article.slug),
    ...(article.noIndex
      ? { robots: { index: false, follow: false } }
      : {}),
    extraTags: {
      openGraph: {
        title: article.metaTitle ?? article.title,
        description: ogDescription,
        url: getBlogArticleHref(article.slug),
        images: ogImage
          ? [
              {
                url: ogImage,
                width: 1200,
                height: 660,
              },
            ]
          : undefined,
        locale: "en_US",
        type: "article",
        publishedTime: article.publishedAt,
        modifiedTime: modified,
        authors: [article.author.name],
      },
    },
  });
}

export default async function BlogArticleRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, allArticles] = await Promise.all([
    resolveBlogArticle(slug),
    resolveBlogArticles(),
  ]);

  if (!article) {
    notFound();
  }

  const articlesRelated = resolveRelatedBlogArticles(article, allArticles);

  return (
    <BlogArticlePage>
      <BlogArticleView article={article} relatedArticles={articlesRelated} />
    </BlogArticlePage>
  );
}
