"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { ResolvedBlogCategory } from "../blog-category-data";
import { getBlogHubHref, getBlogSearchHref } from "../blog-paths";

type BlogSearchHeroProps = {
  query: string;
  activeCategoryRoute: string | null;
  categories: ResolvedBlogCategory[];
};

export function BlogSearchHero({
  query,
  activeCategoryRoute,
  categories,
}: BlogSearchHeroProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(query);
  }, [query]);

  const navigate = (nextQuery: string, nextCategory: string | null) => {
    startTransition(() => {
      router.push(getBlogSearchHref(nextQuery, nextCategory));
    });
  };

  const hasActiveFilters = Boolean(query.trim() || activeCategoryRoute);

  return (
    <header className="pt-10 sm:pt-14 lg:pt-16">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={getBlogHubHref()} className="transition hover:text-foreground">
              Blog
            </Link>
          </li>
          <li aria-hidden className="text-foreground/30">
            /
          </li>
          <li className="font-medium text-foreground">Search</li>
        </ol>
      </nav>

      <form
        className="mt-8 border-b border-foreground/10 sm:mt-10"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(value, activeCategoryRoute);
        }}
      >
        <label htmlFor="blog-search-page" className="sr-only">
          Search blog articles
        </label>
        <div className="relative flex items-center gap-4 pb-4 sm:pb-5">
          <input
            id="blog-search-page"
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="What would you like to read about?"
            autoFocus
            className="min-w-0 flex-1 appearance-none border-0 bg-transparent font-display text-3xl tracking-[-0.04em] text-foreground shadow-none placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0 sm:text-4xl lg:text-5xl [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          <button
            type="submit"
            className="shrink-0 text-sky transition hover:text-sky/80"
            aria-label="Search"
          >
            <Search className="size-6 sm:size-7" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-4 sm:mt-6">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only">Filter by category</span>
          <span aria-hidden>Category</span>
          <select
            value={activeCategoryRoute ?? ""}
            onChange={(event) => {
              const nextCategory = event.target.value || null;
              navigate(value, nextCategory);
            }}
            className="h-9 min-w-[10rem] appearance-none rounded-full border border-foreground/12 bg-background px-4 pr-9 text-sm font-medium text-foreground"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.routeSlug} value={category.routeSlug}>
                {category.titleShort ?? category.title}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters ? (
          <Link
            href={getBlogSearchHref()}
            className="text-sm font-medium text-foreground underline underline-offset-4 transition hover:text-foreground/70"
          >
            Reset filters
          </Link>
        ) : null}
      </div>
    </header>
  );
}
