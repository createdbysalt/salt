import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { articleType } from "../blog-utils";
import { getBlogArticleImageSrc, hasBlogArticleImage } from "../blog-utils";
import { getBlogArticleHref } from "../blog-paths";

type BlogCategoryFeaturedProps = {
  article: articleType;
};

export function BlogCategoryFeatured({ article }: BlogCategoryFeaturedProps) {
  const href = getBlogArticleHref(article.slug);

  return (
    <article className="grid min-w-0 gap-6 border-b border-foreground/10 pb-10 md:grid-cols-2 md:items-center md:gap-10 lg:gap-14 lg:pb-12">
      {hasBlogArticleImage(article) ? (
        <Link
          href={href}
          className="block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
        >
          <Image
            src={getBlogArticleImageSrc(article)!}
            alt={article.image.alt}
            width={1200}
            height={750}
            priority
            {...(article.image.src ? { placeholder: "blur" as const } : {})}
            className="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-[1.01]"
          />
        </Link>
      ) : null}

      <div className="min-w-0">
        <h2 className="text-balance font-display text-2xl leading-[1.12] tracking-[-0.03em] sm:text-3xl lg:text-4xl">
          <Link
            href={href}
            className="transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
          >
            {article.title}
          </Link>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:mt-4">
          By {article.author.name}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-foreground/75 sm:text-base">
          {article.description}
        </p>
        <Link
          href={href}
          className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 transition hover:text-foreground/80"
        >
          Read article
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.25}
            aria-hidden
          />
        </Link>
      </div>
    </article>
  );
}
