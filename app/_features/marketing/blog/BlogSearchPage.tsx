import Link from "next/link";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import { Landing2WaitlistSection } from "@/app/_features/marketing/landing2/Landing2WaitlistSection";
import "@/app/_features/marketing/landing2/landing2.css";
import type { ResolvedBlogCategory } from "./blog-category-data";
import { getBlogHubHref } from "./blog-paths";
import {
  filterArticlesByCategory,
  filterArticlesBySearch,
  sortArticlesByDate,
  type articleType,
} from "./blog-utils";
import { getLegacyCategorySlug } from "./blog-category-config";
import { BlogBrowseArticleCard } from "./components/BlogBrowseArticleCard";
import { BlogSearchHero } from "./components/BlogSearchHero";

type BlogSearchPageProps = {
  query: string;
  categoryRouteSlug: string | null;
  categories: ResolvedBlogCategory[];
  articles: articleType[];
};

export function BlogSearchPage({
  query,
  categoryRouteSlug,
  categories,
  articles,
}: BlogSearchPageProps) {
  const legacyCategory = categoryRouteSlug
    ? getLegacyCategorySlug(categoryRouteSlug)
    : null;

  const results = sortArticlesByDate(
    filterArticlesBySearch(
      filterArticlesByCategory(articles, legacyCategory),
      query
    )
  );

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  return (
    <div className="landing2-home">
      <main className="min-h-screen overflow-x-hidden bg-background">
        <Landing2NavServer />

        <section className="pb-12 sm:pb-16">
          <Landing2Container>
            <BlogSearchHero
              query={query}
              activeCategoryRoute={categoryRouteSlug}
              categories={categories}
            />

            {hasQuery || categoryRouteSlug ? (
              <p className="mt-8 text-sm text-muted-foreground sm:mt-10">
                {results.length === 0
                  ? "No articles match your search."
                  : `${results.length} article${results.length === 1 ? "" : "s"} found`}
                {hasQuery ? (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-medium text-foreground">
                      &ldquo;{trimmedQuery}&rdquo;
                    </span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-8 text-sm text-muted-foreground sm:mt-10">
                Enter a keyword to search the blog.
              </p>
            )}

            {results.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:mt-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
                {results.map((article) => (
                  <BlogBrowseArticleCard key={article.slug} article={article} />
                ))}
              </div>
            ) : hasQuery || categoryRouteSlug ? (
              <p className="mt-10 text-sm text-muted-foreground">
                Try a different keyword or{" "}
                <Link
                  href={getBlogHubHref()}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  browse all articles
                </Link>
                .
              </p>
            ) : null}
          </Landing2Container>
        </section>

        <Landing2WaitlistSection />

        <section className="pb-16 sm:pb-24">
          <Landing2Container>
            <Link
              href={getBlogHubHref()}
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
            >
              ← Back to all articles
            </Link>
          </Landing2Container>
        </section>
      </main>
      <Landing2FooterServer />
    </div>
  );
}
