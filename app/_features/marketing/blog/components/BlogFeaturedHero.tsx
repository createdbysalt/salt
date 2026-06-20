import Image from "next/image";
import Link from "next/link";
import type { articleType } from "../blog-utils";
import { getBlogArticleImageSrc, hasBlogArticleImage } from "../blog-utils";
import { getBlogArticleHref } from "../blog-paths";

type BlogFeaturedHeroProps = {
  article: articleType;
};

export function BlogFeaturedHero({ article }: BlogFeaturedHeroProps) {
  const href = getBlogArticleHref(article.slug);

  return (
    <article className="group min-w-0">
      {hasBlogArticleImage(article) ? (
        <Link
          href={href}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
        >
          <div className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
            <Image
              src={getBlogArticleImageSrc(article)!}
              alt={article.image.alt}
              width={1200}
              height={630}
              priority
              {...(article.image.src ? { placeholder: "blur" as const } : {})}
              className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </Link>
      ) : null}

      <div className="mt-5 sm:mt-6">
        <h3 className="text-balance font-display text-lg leading-[1.15] tracking-[-0.02em] sm:text-xl md:text-2xl">
          <Link
            href={href}
            className="transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
          >
            {article.title}
          </Link>
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {article.description}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">By {article.author.name}</p>
      </div>
    </article>
  );
}
