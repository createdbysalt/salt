import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { categoryType } from "@/app/(public)/learn/_assets/content";
import { getCategoryRouteSlug } from "../blog-category-config";
import {
  getBlogCategoryHref,
  getBlogHubHref,
} from "../blog-paths";

type BlogArticleBreadcrumbsProps = {
  title: string;
  categories: categoryType[];
  /** Webflow-style: Blog → category only; article title lives in H1 */
  showArticleTitle?: boolean;
};

export function BlogArticleBreadcrumbs({
  title,
  categories,
  showArticleTitle = true,
}: BlogArticleBreadcrumbsProps) {
  const primary = categories[0];
  const categoryRouteSlug = primary
    ? getCategoryRouteSlug(primary.slug)
    : null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground sm:mb-6">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link
            href={getBlogHubHref()}
            className="transition hover:text-foreground"
          >
            Blog
          </Link>
        </li>
        {primary && categoryRouteSlug ? (
          <>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link
                href={getBlogCategoryHref(categoryRouteSlug)}
                className="transition hover:text-foreground"
              >
                {primary.titleShort ?? primary.title}
              </Link>
            </li>
          </>
        ) : null}
        {showArticleTitle ? (
          <>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <span className="text-foreground" aria-current="page">
                {title}
              </span>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
