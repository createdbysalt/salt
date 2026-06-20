import type { articleType } from "../blog-utils";
import { BlogFeaturedHero } from "./BlogFeaturedHero";
import { BlogLatestListItem } from "./BlogLatestListItem";
import { BlogMoneyOnTablePromo } from "./BlogMoneyOnTablePromo";

type BlogLatestSectionProps = {
  featured: articleType;
  latest: articleType[];
};

const latestHeadingClass =
  "mb-6 font-display text-xl tracking-[-0.02em] sm:text-2xl";

export function BlogLatestSection({ featured, latest }: BlogLatestSectionProps) {
  return (
    <section aria-labelledby="blog-latest-heading" className="pt-8 sm:pt-10 md:pt-12">
      <div className="grid gap-8 md:grid-cols-2 md:items-start md:gap-10 lg:gap-12 xl:gap-16">
        <div className="min-w-0">
          <h2 id="blog-latest-heading" className={latestHeadingClass}>
            Latest articles
          </h2>
          <BlogFeaturedHero article={featured} />
        </div>

        {latest.length > 0 ? (
          <div className="min-w-0 border-t border-foreground/10 pt-8 md:border-t-0 md:pt-0">
            <h2 className={`${latestHeadingClass} hidden md:block`}>Latest articles</h2>
            <p className="mb-5 font-display text-lg tracking-[-0.02em] text-muted-foreground md:hidden">
              More stories
            </p>
            <div>
              {latest.map((article) => (
                <BlogLatestListItem key={article.slug} article={article} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <BlogMoneyOnTablePromo />
    </section>
  );
}
