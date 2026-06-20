import { Suspense } from "react";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import { Landing2WaitlistSection } from "@/app/_features/marketing/landing2/Landing2WaitlistSection";
import { getCompareHubEntries } from "@/app/_features/marketing/compare/get-compare-hub-entries";
import { getLandingPage } from "@/app/_lib/sanity/queries";
import "@/app/_features/marketing/landing2/landing2.css";
import { getBlogQuoteSlides } from "./blog-article-quotes";
import { resolveBlogCategories } from "./blog-category-data";
import { resolveBlogArticles } from "./blog-article-data";
import {
  filterArticlesByCategory,
  sortArticlesByDate,
} from "./blog-utils";
import { BlogBrowseAll } from "./components/BlogBrowseAll";
import { BlogCompareSection } from "./components/BlogCompareSection";
import { BlogHeroSection } from "./components/BlogHeroSection";
import { BlogLatestSection } from "./components/BlogLatestSection";
import { BlogQuoteCarousel } from "./components/BlogQuoteCarousel";

type BlogHubPageProps = {
  activeCategory?: string | null;
};

export async function BlogHubPage({
  activeCategory = null,
}: BlogHubPageProps) {
  const articles = await resolveBlogArticles();
  const sorted = sortArticlesByDate(articles);
  const filtered = filterArticlesByCategory(sorted, activeCategory);
  const [featured, ...rest] = filtered;

  const latestSidebar = rest.slice(0, 4);
  const browseArticles = rest.slice(4);
  const quoteSlides = getBlogQuoteSlides(filtered);

  const compareEntries = await getCompareHubEntries();
  const blogCategories = await resolveBlogCategories();
  const blogHubPage = await getLandingPage("blog");
  const hubContent = blogHubPage?.hubContent;

  const activeCategoryMeta = activeCategory
    ? blogCategories.find(
        (c) =>
          c.legacySlug === activeCategory || c.routeSlug === activeCategory
      )
    : null;

  return (
    <div className="landing2-home">
      <main className="min-h-screen overflow-x-hidden bg-background">
        <Landing2NavServer />

        <section className="pb-12 sm:pb-16">
          <Landing2Container>
            <Suspense fallback={null}>
              <BlogHeroSection
                categories={blogCategories}
                activeCategory={activeCategory}
                eyebrow={hubContent?.eyebrow}
                headline={hubContent?.headline}
                subheadline={hubContent?.subheadline}
              />
            </Suspense>

            {activeCategoryMeta ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Showing articles in{" "}
                <span className="font-medium text-foreground">
                  {activeCategoryMeta.titleShort ?? activeCategoryMeta.title}
                </span>
              </p>
            ) : null}

            {featured ? (
              <BlogLatestSection featured={featured} latest={latestSidebar} />
            ) : (
              <p className="pt-10 text-sm text-muted-foreground">
                No articles match your search. Try a different keyword or category.
              </p>
            )}
          </Landing2Container>
        </section>

        {quoteSlides.length > 0 ? (
          <section className="pb-12 sm:pb-16">
            <Landing2Container>
              <BlogQuoteCarousel slides={quoteSlides} />
            </Landing2Container>
          </section>
        ) : null}

        <Landing2WaitlistSection />

        {browseArticles.length > 0 ? (
          <section className="pb-12 sm:pb-16">
            <Landing2Container>
              <BlogBrowseAll articles={browseArticles} />
            </Landing2Container>
          </section>
        ) : null}

        <section className="pb-16 sm:pb-24">
          <Landing2Container>
            <BlogCompareSection entries={compareEntries} />
          </Landing2Container>
        </section>
      </main>
      <Landing2FooterServer />
    </div>
  );
}
