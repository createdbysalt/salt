import Script from "next/script";
import { notFound } from "next/navigation";
import { BlogAuthorPage } from "@/app/_features/marketing/blog/BlogAuthorPage";
import {
  resolveBlogAuthor,
  resolveBlogAuthorSlugs,
} from "@/app/_features/marketing/blog/blog-author-data";
import { resolveBlogArticles } from "@/app/_features/marketing/blog/blog-article-data";
import { getBlogAuthorHref } from "@/app/_features/marketing/blog/blog-paths";
import { toAbsoluteBlogImageUrl } from "@/app/_features/marketing/blog/blog-image-url";
import { sortArticlesByDate } from "@/app/_features/marketing/blog/blog-utils";
import { buildBlogAuthorGraph } from "@/app/_lib/seo/blog-structured-data";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export async function generateStaticParams() {
  const slugs = await resolveBlogAuthorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await resolveBlogAuthor(slug);
  if (!author) return getSEOTags({ title: "Author Not Found" });

  return getSEOTags({
    title: `${author.name} | ${config.appName} Blog`,
    description: author.description,
    canonicalUrlRelative: getBlogAuthorHref(author.slug),
    extraTags: author.avatar
      ? {
          openGraph: {
            title: author.name,
            description: author.description,
            url: getBlogAuthorHref(author.slug),
            images: [
              {
                url: toAbsoluteBlogImageUrl(author.avatar),
                width: 384,
                height: 384,
              },
            ],
          },
        }
      : undefined,
  });
}

export default async function BlogAuthorRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await resolveBlogAuthor(slug);

  if (!author) {
    notFound();
  }

  const allArticles = await resolveBlogArticles();
  const articlesByAuthor = sortArticlesByDate(
    allArticles.filter((article) => article.author.slug === author.slug)
  );

  const structuredData = buildBlogAuthorGraph({
    name: author.name,
    job: author.job,
    description: author.description,
    slug: author.slug,
    articles: articlesByAuthor,
  });

  return (
    <>
      <Script
        type="application/ld+json"
        id={`json-ld-author-${author.slug}`}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <BlogAuthorPage author={author} articles={articlesByAuthor} />
    </>
  );
}
