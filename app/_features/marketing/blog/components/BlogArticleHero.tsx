import Image from "next/image";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import type { BlogArticle } from "../blog-types";
import { getBlogArticleImageSrc, hasBlogArticleImage } from "../blog-utils";
import { BlogArticleBreadcrumbs } from "./BlogArticleBreadcrumbs";

type BlogArticleHeroProps = {
  article: BlogArticle;
};

export function BlogArticleHero({ article }: BlogArticleHeroProps) {
  const heroSrc = getBlogArticleImageSrc(article);
  const showVisual = hasBlogArticleImage(article) && heroSrc;
  const dek = article.dek ?? { rest: article.description };

  return (
    <section className="blog-editorial-hero compare-detail-hero border-b border-foreground/8 pb-10 pt-8 sm:pb-16 sm:pt-12 lg:pb-20 lg:pt-14">
      <Landing2Container className="relative z-10">
        <BlogArticleBreadcrumbs
          title={article.title}
          categories={article.categories}
          showArticleTitle={false}
        />

        <div
          className={
            showVisual
              ? "grid items-center gap-8 pt-2 sm:gap-12 sm:pt-4 md:gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 lg:pt-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
              : "mx-auto max-w-3xl pt-2 sm:pt-4"
          }
        >
          <div className="min-w-0">
            <h1 className="speakable-blog-headline font-display text-balance text-[1.875rem] leading-[1.08] tracking-[-0.035em] sm:text-[2.125rem] sm:leading-[1.06] md:text-5xl md:leading-[1.05] lg:text-[3.25rem]">
              {article.title}
            </h1>

            <p className="speakable-blog-dek mt-4 max-w-[52ch] text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-[15px] sm:leading-[1.55] md:text-base lg:text-lg">
              {dek.lead ? (
                <>
                  <strong>{dek.lead}</strong>
                  {dek.rest ? ` ${dek.rest}` : null}
                </>
              ) : (
                dek.rest
              )}
            </p>
          </div>

          {showVisual ? (
            <div className="blog-editorial-hero__visual relative min-w-0">
              <figure className="overflow-hidden rounded-2xl border border-foreground/10 bg-card/40 shadow-[0_24px_64px_-32px_color-mix(in_oklab,var(--sky)_45%,transparent)]">
                <div className="relative aspect-[5/4] w-full sm:aspect-[4/3]">
                  <Image
                    src={heroSrc}
                    alt={article.image.alt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover"
                  />
                </div>
              </figure>
            </div>
          ) : null}
        </div>
      </Landing2Container>
    </section>
  );
}
