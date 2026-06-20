import Image from "next/image";
import Link from "next/link";
import { cn } from "@repo/utils";
import type { articleType } from "../blog-utils";
import {
  formatBlogDateShort,
  getBlogArticleImageSrc,
  getPrimaryCategory,
  hasBlogArticleImage,
} from "../blog-utils";
import { getBlogArticleHref } from "../blog-paths";
import { blogCategoryLabelClass } from "../blog-category-chip";
import { BlogReadLink } from "./BlogReadLink";

type BlogArticleCardProps = {
  article: articleType;
  variant?: "compact" | "media" | "grid";
  priority?: boolean;
  className?: string;
};

export function BlogArticleCard({
  article,
  variant = "grid",
  priority = false,
  className,
}: BlogArticleCardProps) {
  const category = getPrimaryCategory(article);
  const href = getBlogArticleHref(article.slug);

  if (variant === "compact") {
    return (
      <article
        className={cn(
          "group flex min-h-[9.5rem] flex-col justify-between rounded-xl border border-foreground/10 bg-card p-5 transition hover:border-foreground/20 hover:bg-foreground/[0.02]",
          className
        )}
      >
        <div>
          {category ? (
            <p className={`${blogCategoryLabelClass()} mb-3`}>
              {category.titleShort ?? category.title}
            </p>
          ) : null}
          <h3 className="font-display text-lg leading-snug tracking-[-0.02em] sm:text-xl">
            <Link
              href={href}
              className="transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
            >
              {article.title}
            </Link>
          </h3>
        </div>
        <BlogReadLink href={href} className="mt-4" />
      </article>
    );
  }

  if (variant === "media") {
    return (
      <article
        className={cn(
          "group overflow-hidden rounded-xl border border-foreground/10 bg-card transition hover:border-foreground/20 hover:bg-foreground/[0.02]",
          className
        )}
      >
        {hasBlogArticleImage(article) ? (
          <Link href={href} className="block overflow-hidden">
            <Image
              src={getBlogArticleImageSrc(article)!}
              alt={article.image.alt}
              width={800}
              height={450}
              priority={priority}
              {...(article.image.src ? { placeholder: "blur" as const } : {})}
              className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          </Link>
        ) : null}
        <div className="p-5">
          {category ? (
            <p className={`${blogCategoryLabelClass()} mb-3`}>
              {category.titleShort ?? category.title}
            </p>
          ) : null}
          <h3 className="font-display text-lg leading-snug tracking-[-0.02em]">
            <Link href={href}>{article.title}</Link>
          </h3>
          <BlogReadLink href={href} className="mt-4" />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-xl border border-foreground/10 bg-card transition hover:border-foreground/20 hover:bg-foreground/[0.02]",
        className
      )}
    >
      {hasBlogArticleImage(article) ? (
        <Link href={href} className="block overflow-hidden">
          <Image
            src={getBlogArticleImageSrc(article)!}
            alt={article.image.alt}
            width={800}
            height={450}
            priority={priority}
            {...(article.image.src ? { placeholder: "blur" as const } : {})}
            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </Link>
      ) : null}
      <div className="p-5 sm:p-6">
        {category ? (
          <p className={`${blogCategoryLabelClass()} mb-3`}>
            {category.titleShort ?? category.title}
          </p>
        ) : null}
        <h3 className="font-display text-xl leading-snug tracking-[-0.02em] sm:text-2xl">
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {article.description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          {article.author.name}
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <time dateTime={article.publishedAt}>
            {formatBlogDateShort(article.publishedAt)}
          </time>
        </p>
      </div>
    </article>
  );
}
