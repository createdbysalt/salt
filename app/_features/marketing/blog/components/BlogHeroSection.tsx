import type { ResolvedBlogCategory } from "../blog-category-data";
import { BlogCategoryNav } from "./BlogCategoryNav";
import { BlogSearch } from "./BlogSearch";

type BlogHeroSectionProps = {
  categories: ResolvedBlogCategory[];
  activeCategory: string | null;
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
};

export function BlogHeroSection({
  categories,
  activeCategory,
  eyebrow = "Salt Blog",
  headline = "Stories, insights, and advice",
  subheadline = "Practical advice for independent professionals — pricing, clients, scope, and how proactive AI helps you grow.",
}: BlogHeroSectionProps) {
  return (
    <header className="pb-0 pt-10 sm:pt-14 lg:pt-16">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.04] px-3 py-1 text-xs font-medium text-foreground/65 sm:text-sm sm:text-foreground/70">
        <span className="size-1.5 shrink-0 rounded-full bg-sky" aria-hidden />
        {eyebrow}
      </span>

      <h1 className="mt-4 max-w-3xl font-display text-balance text-[1.75rem] leading-[1.12] tracking-[-0.03em] sm:text-[2.75rem] sm:leading-[1.1] lg:text-[3.25rem]">
        {headline}
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
        {subheadline}
      </p>

      <div className="mt-8 flex min-w-0 flex-col gap-6 border-b border-foreground/10 pb-5 sm:mt-12 md:flex-row md:items-center md:justify-between md:gap-8 lg:gap-10">
        <BlogCategoryNav categories={categories} activeCategory={activeCategory} />
        <BlogSearch />
      </div>
    </header>
  );
}
