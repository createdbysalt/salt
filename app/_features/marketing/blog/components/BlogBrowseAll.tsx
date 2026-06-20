"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { articleType } from "../blog-utils";
import { BlogBrowseArticleCard } from "./BlogBrowseArticleCard";

const PAGE_SIZE = 8;

type BlogBrowseAllProps = {
  articles: articleType[];
};

function filterBrowseArticles(list: articleType[], query: string): articleType[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return list;

  return list.filter(
    (article) =>
      article.title.toLowerCase().includes(trimmed) ||
      article.description.toLowerCase().includes(trimmed) ||
      article.author.name.toLowerCase().includes(trimmed) ||
      article.categories.some((category) =>
        category.title.toLowerCase().includes(trimmed)
      )
  );
}

export function BlogBrowseAll({ articles }: BlogBrowseAllProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredArticles = useMemo(
    () => filterBrowseArticles(articles, searchQuery),
    [articles, searchQuery]
  );

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  return (
    <section aria-labelledby="blog-browse-heading">
      <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-8 lg:gap-10">
        <h2
          id="blog-browse-heading"
          className="font-display text-xl tracking-[-0.03em] sm:text-2xl lg:text-3xl"
        >
          Browse all
        </h2>

        <form
          className="relative w-full shrink-0 sm:w-[min(100%,18rem)] md:w-[min(100%,20rem)] lg:w-[min(100%,22rem)]"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="blog-browse-search" className="sr-only">
            Search for an article
          </label>
          <input
            id="blog-browse-search"
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search for an article"
            className="w-full appearance-none border-0 border-b border-foreground/10 bg-transparent py-1.5 pr-8 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus:border-foreground/25 focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          <Search
            className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
        </form>
      </div>

      {visibleArticles.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:mt-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
          {visibleArticles.map((article) => (
            <BlogBrowseArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          No articles match your search.
        </p>
      )}

      {hasMore ? (
        <div className="mt-10 flex justify-center sm:mt-12">
          <button
            type="button"
            className="rounded-lg bg-foreground/[0.06] px-8 py-3 text-sm font-medium transition hover:bg-foreground/10"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Show more
          </button>
        </div>
      ) : null}
    </section>
  );
}
