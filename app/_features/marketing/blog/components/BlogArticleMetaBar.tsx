import Link from "next/link";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import { getCategoryRouteSlug } from "../blog-category-config";
import { getBlogCategoryHref } from "../blog-paths";

type BlogArticleMetaBarProps = {
  article: articleType;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogArticleMetaBar({ article }: BlogArticleMetaBarProps) {
  const primary = article.categories[0];
  const categoryRoute = primary
    ? getCategoryRouteSlug(primary.slug)
    : null;
  const modified = article.updatedAt ?? article.publishedAt;

  return (
    <div className="blog-article-meta-bar mt-12 border-t border-foreground/10 pt-6 text-sm text-muted-foreground">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide">
            Last updated
          </dt>
          <dd className="mt-1 text-foreground">
            <time dateTime={modified}>{formatDate(modified)}</time>
          </dd>
        </div>
        {primary && categoryRoute ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide">
              Category
            </dt>
            <dd className="mt-1">
              <Link
                href={getBlogCategoryHref(categoryRoute)}
                className="font-medium text-foreground underline underline-offset-[3px] transition hover:text-foreground/70"
              >
                {primary.titleShort ?? primary.title}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
