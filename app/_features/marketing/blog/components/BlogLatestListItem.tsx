import Link from "next/link";
import type { articleType } from "../blog-utils";
import { getPrimaryCategory } from "../blog-utils";
import { getBlogArticleHref } from "../blog-paths";

type BlogLatestListItemProps = {
  article: articleType;
};

export function BlogLatestListItem({ article }: BlogLatestListItemProps) {
  const category = getPrimaryCategory(article);
  const href = getBlogArticleHref(article.slug);

  return (
    <article className="border-b border-foreground/10 py-4 first:pt-0 last:border-b-0 sm:py-5">
      {category ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
          {category.titleShort ?? category.title}
        </p>
      ) : null}
      <h3 className="mt-2 text-balance font-display text-base font-medium leading-snug tracking-[-0.02em] sm:text-lg md:text-xl">
        <Link
          href={href}
          className="transition hover:text-foreground/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
        >
          {article.title}
        </Link>
      </h3>
    </article>
  );
}
