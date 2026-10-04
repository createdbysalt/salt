import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import config from "@/config";
import { getSEOTags } from "@/app/_lib/seo";
import { LearnSiteChrome } from "@/app/_features/marketing/components/LearnSiteChrome";
import Avatar from "../_assets/components/Avatar";
import BadgeCategory from "../_assets/components/BadgeCategory";
import { articles } from "../_assets/content";

type Params = Promise<{ articleId: string }>;

const site = `https://${config.domainName}`;

function findArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export async function generateMetadata({ params }: { params: Params }) {
  const { articleId } = await params;
  const article = findArticle(articleId);
  if (!article) return getSEOTags({ title: "Article Not Found" });

  return getSEOTags({
    title: article.title,
    description: article.description,
    canonicalUrlRelative: `/learn/${article.slug}`,
    extraTags: {
      openGraph: {
        title: article.title,
        description: article.description,
        url: `/learn/${article.slug}`,
        images: [{ url: article.image.urlRelative, width: 1200, height: 660 }],
        locale: "en_US",
        type: "article",
      },
    },
  });
}

/** Structured data for search engines: the article, its breadcrumb, and the site. */
function structuredData(article: NonNullable<ReturnType<typeof findArticle>>) {
  const url = `${site}/learn/${article.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      headline: article.title,
      description: article.description,
      image: `${site}${article.image.urlRelative}`,
      datePublished: article.publishedAt,
      dateModified: article.publishedAt,
      author: { "@type": "Person", name: article.author.name },
      publisher: {
        "@type": "Organization",
        name: config.appName,
        logo: { "@type": "ImageObject", url: `${site}/logo.png` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
        { "@type": "ListItem", position: 2, name: "Learn", item: `${site}/learn` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
  ];
}

export default async function LearnArticlePage({ params }: { params: Params }) {
  const { articleId } = await params;
  const article = findArticle(articleId);
  if (!article) notFound();

  const categorySlugs = new Set(article.categories.map((c) => c.slug));
  const related = articles
    .filter((a) => a.slug !== article.slug && a.categories.some((c) => categorySlugs.has(c.slug)))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);

  const published = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <LearnSiteChrome>
      {structuredData(article).map((data, index) => (
        <Script
          key={index}
          id={`ld-${article.slug}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}

      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <span aria-hidden>←</span> Back to Learn
      </Link>

      <article className="mt-10">
        <header className="mb-12 max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {article.categories.map((category) => (
              <BadgeCategory key={category.slug} category={category} />
            ))}
            <time dateTime={article.publishedAt} className="text-sm text-muted-foreground">
              {published}
            </time>
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            {article.title}
          </h1>
          <p className="max-w-2xl text-muted-foreground md:text-lg">{article.description}</p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="space-y-12 md:space-y-16">{article.content}</section>

          <aside className="space-y-10 border-border lg:border-l lg:pl-10">
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Written by</p>
              <Avatar article={article} />
            </div>

            {related.length > 0 ? (
              <div>
                <p className="mb-3 text-sm text-muted-foreground">Related reading</p>
                <ul className="space-y-5">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/learn/${item.slug}`}
                        rel="bookmark"
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </article>
    </LearnSiteChrome>
  );
}
