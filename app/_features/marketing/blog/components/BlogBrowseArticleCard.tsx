import Image from "next/image";
import Link from "next/link";
import type { articleType } from "../blog-utils";
import { getBlogArticleImageSrc, getPrimaryCategory, hasBlogArticleImage } from "../blog-utils";
import { getBlogArticleHref } from "../blog-paths";
import { blogCategoryChipClass } from "../blog-category-chip";

type BlogBrowseArticleCardProps = {
  article: articleType;
};

export function BlogBrowseArticleCard({ article }: BlogBrowseArticleCardProps) {
  const category = getPrimaryCategory(article);
  const href = getBlogArticleHref(article.slug);

  return (
    <article className="group flex h-full min-w-0 flex-col">
      {hasBlogArticleImage(article) ? (
        <Link
          href={href}
          className="block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
        >
          <Image
            src={getBlogArticleImageSrc(article)!}
            alt={article.image.alt}
            width={640}
            height={400}
            {...(article.image.src ? { placeholder: "blur" as const } : {})}
            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </Link>
      ) : null}

      <h3 className="mt-4 text-balance font-display text-base font-medium leading-snug tracking-[-0.02em] sm:text-lg">
        <Link
          href={href}
          className="transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
        >
          {article.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-foreground/75">
        {article.description}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {category ? (
          <span className={blogCategoryChipClass()}>{category.titleShort ?? category.title}</span>
        ) : (
          <span />
        )}
        <p className="truncate text-xs text-muted-foreground sm:max-w-[55%] sm:text-right sm:text-sm">
          By {article.author.name}
        </p>
      </div>
    </article>
  );
}
