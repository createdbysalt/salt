import Link from "next/link";
import { cn } from "@repo/utils";
import type { ResolvedBlogCategory } from "../blog-category-data";
import { getCategoryRouteSlug } from "../blog-category-config";
import { blogCategoryChipClass } from "../blog-category-chip";
import { getBlogCategoryHref, getBlogHubHref } from "../blog-paths";

type BlogCategoryNavProps = {
  categories: ResolvedBlogCategory[];
  /** Route slug (features) or legacy slug (feature) from hub query params */
  activeCategory: string | null;
};

export function BlogCategoryNav({
  categories,
  activeCategory,
}: BlogCategoryNavProps) {
  const activeRoute = activeCategory ? getCategoryRouteSlug(activeCategory) : null;

  return (
    <nav
      aria-label="Blog categories"
      className="-mx-6 flex min-w-0 gap-2 overflow-x-auto px-6 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      <Link
        href={getBlogHubHref()}
        className={cn(blogCategoryChipClass(!activeRoute), "shrink-0")}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = activeRoute === category.routeSlug;
        return (
          <Link
            key={category.routeSlug}
            href={getBlogCategoryHref(category.routeSlug)}
            className={cn(blogCategoryChipClass(isActive), "shrink-0")}
          >
            {category.titleShort ?? category.title}
          </Link>
        );
      })}
    </nav>
  );
}
