import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CompareHubEntry } from "@/app/_features/marketing/compare/compare-pages";
import { getCompareArticleHref } from "@/app/_features/marketing/compare/compare-pages";
import { CompareHubCard } from "@/app/_features/marketing/compare/CompareHubCard";

type BlogCompareSectionProps = {
  entries: CompareHubEntry[];
};

export function BlogCompareSection({ entries }: BlogCompareSectionProps) {
  const featured = entries.slice(0, 4);

  if (featured.length === 0) return null;

  return (
    <section aria-labelledby="blog-guides-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2
            id="blog-guides-heading"
            className="font-display text-xl tracking-[-0.03em] sm:text-2xl lg:text-3xl"
          >
            Guides & comparisons
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            Deep dives on Salt vs other approaches for running an independent practice.
          </p>
        </div>
        <Link
          href="/compare"
          className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          View all
          <ArrowUpRight
            className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={2.25}
            aria-hidden
          />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {featured.map((entry) => (
          <CompareHubCard key={entry.slug} entry={entry} />
        ))}
      </div>
      <p className="sr-only">
        {featured.map((entry) => getCompareArticleHref(entry.slug)).join(", ")}
      </p>
    </section>
  );
}
