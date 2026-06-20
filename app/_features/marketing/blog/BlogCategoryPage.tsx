import Link from "next/link";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import { Landing2WaitlistSection } from "@/app/_features/marketing/landing2/Landing2WaitlistSection";
import "@/app/_features/marketing/landing2/landing2.css";
import type { ResolvedBlogCategory } from "./blog-category-data";
import {
  filterArticlesByCategory,
  sortArticlesByDate,
  type articleType,
} from "./blog-utils";
import { getBlogHubHref } from "./blog-paths";
import { BlogBrowseArticleCard } from "./components/BlogBrowseArticleCard";
import { BlogCategoryFeatured } from "./components/BlogCategoryFeatured";

type BlogCategoryPageProps = {
  category: ResolvedBlogCategory;
  articles: articleType[];
};

export function BlogCategoryPage({
  category,
  articles,
}: BlogCategoryPageProps) {
  const sorted = sortArticlesByDate(articles);
  const [featured, ...rest] = sorted;

  return (
    <div className="landing2-home">
      <main className="min-h-screen overflow-x-hidden bg-background">
        <Landing2NavServer />

        <section className="pb-12 sm:pb-16">
          <Landing2Container>
            <header className="pt-10 sm:pt-14 md:pt-16">
              <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
                <ol className="flex flex-wrap items-center gap-1.5">
                  <li>
                    <Link
                      href={getBlogHubHref()}
                      className="transition hover:text-foreground"
                    >
                      Blog
                    </Link>
                  </li>
                  <li aria-hidden className="text-foreground/30">
                    /
                  </li>
                  <li className="font-medium text-foreground">
                    {category.titleShort ?? category.title}
                  </li>
                </ol>
              </nav>

              <div className="mt-8 grid gap-4 border-b border-foreground/10 pb-8 md:mt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-end md:gap-10 lg:gap-16 lg:pb-10">
                <h1 className="font-display text-4xl tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  {category.titleShort ?? category.title}
                </h1>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {category.description}
                </p>
              </div>
            </header>

            {featured ? (
              <div className="pt-10 sm:pt-12">
                <BlogCategoryFeatured article={featured} />
              </div>
            ) : (
              <p className="pt-10 text-sm text-muted-foreground">
                No articles in this category yet.
              </p>
            )}

            {rest.length > 0 ? (
              <section aria-labelledby="browse-category-heading" className="pt-10 sm:pt-12">
                <h2
                  id="browse-category-heading"
                  className="font-display text-xl tracking-[-0.03em] sm:text-2xl lg:text-3xl"
                >
                  Browse category
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:mt-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
                  {rest.map((article) => (
                    <BlogBrowseArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              </section>
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
