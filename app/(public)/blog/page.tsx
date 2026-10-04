import { BlogHubPage } from "@/app/_features/marketing/blog/BlogHubPage";
import { resolveBlogArticles } from "@/app/_features/marketing/blog/blog-article-data";
import { getCategoryRouteSlug } from "@/app/_features/marketing/blog/blog-category-config";
import { getBlogArticleHref, getBlogCategoryHref, getBlogHubHref, getBlogSearchHref } from "@/app/_features/marketing/blog/blog-paths";
import { getLandingPage } from "@/app/_lib/sanity/queries";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";
import { redirect } from "next/navigation";

export async function generateMetadata() {
  const blogHubPage = await getLandingPage("blog");

  return getSEOTags({
    title:
      blogHubPage?.seo?.title ??
      `${config.appName} Blog | Proactive AI for Independent Professionals`,
    description:
      blogHubPage?.seo?.description ??
      "Practical advice for independent professionals — pricing, client qualification, scope management, and how Salt's proactive AI helps you grow.",
    canonicalUrlRelative: "/blog",
  });
}

function BlogStructuredData({
  articles,
  description,
}: {
  articles: Awaited<ReturnType<typeof resolveBlogArticles>>;
  description?: string;
}) {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const itemList = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${config.appName} Blog`,
    description:
      description ??
      "Practical advice for independent professionals running their own practice.",
    url: `https://${config.domainName}${getBlogHubHref()}`,
    blogPost: sorted.slice(0, 20).map((article) => ({
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      author: {
        "@type": "Person",
        name: article.author.name,
      },
      url: `https://${config.domainName}${getBlogArticleHref(article.slug)}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
    />
  );
}

type BlogPageProps = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category, q } = await searchParams;
  const [articles, blogHubPage] = await Promise.all([
    resolveBlogArticles(),
    getLandingPage("blog"),
  ]);

  if (q?.trim()) {
    redirect(getBlogSearchHref(q, category ?? null));
  }

  if (category) {
    const routeSlug = getCategoryRouteSlug(category);
    if (routeSlug) {
      redirect(getBlogCategoryHref(routeSlug));
    }
  }

  return (
    <>
      <BlogStructuredData
        articles={articles}
        description={
          blogHubPage?.seo?.description ?? blogHubPage?.hubContent?.subheadline
        }
      />
      <BlogHubPage activeCategory={category ?? null} />
    </>
  );
}
