import Link from "next/link";
import type { categoryType } from "../blog-utils";
import { getCategoryRouteSlug } from "../blog-category-config";
import { blogCategoryChipClass } from "../blog-category-chip";
import { getBlogCategoryHref } from "../blog-paths";

type BlogCategoryBadgeProps = {
  category: categoryType;
};

export function BlogCategoryBadge({ category }: BlogCategoryBadgeProps) {
  const routeSlug = getCategoryRouteSlug(category.slug) ?? category.slug;

  return (
    <Link
      href={getBlogCategoryHref(routeSlug)}
      className={blogCategoryChipClass()}
      title={`Posts in ${category.title}`}
      rel="tag"
    >
      {category.titleShort ?? category.title}
    </Link>
  );
}
