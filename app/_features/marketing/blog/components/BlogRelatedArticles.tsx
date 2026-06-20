import type { articleType } from "@/app/(public)/learn/_assets/content";
import { BlogArticleCard } from "./BlogArticleCard";

type BlogRelatedArticlesProps = {
  articles: articleType[];
};

export function BlogRelatedArticles({ articles }: BlogRelatedArticlesProps) {
  if (!articles.length) return null;

  return (
    <section
      className="mt-10 border-t border-foreground/10 pt-8 sm:mt-14 sm:pt-10"
      aria-labelledby="blog-related-heading"
    >
      <h2
        id="blog-related-heading"
        className="mb-5 font-display text-lg font-semibold tracking-tight sm:mb-6 sm:text-xl"
      >
        Related reading
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <BlogArticleCard
            key={article.slug}
            article={article}
            variant="compact"
          />
        ))}
      </div>
    </section>
  );
}
