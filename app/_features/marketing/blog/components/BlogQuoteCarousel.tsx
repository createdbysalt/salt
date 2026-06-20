"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@repo/utils";
import type { BlogQuoteSlide } from "../blog-article-quotes";
import { getBlogArticleImageSrc, getPrimaryCategory, hasBlogArticleImage } from "../blog-utils";
import { getBlogArticleHref } from "../blog-paths";

const AUTO_ADVANCE_MS = 7000;
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type BlogQuoteCarouselProps = {
  slides: BlogQuoteSlide[];
};

function BlogQuoteSlidePanel({ slide }: { slide: BlogQuoteSlide }) {
  const { article, quote } = slide;
  const category = getPrimaryCategory(article);
  const href = getBlogArticleHref(article.slug);

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] md:gap-8 lg:gap-10 xl:gap-14">
      <div className="relative mx-auto aspect-[16/10] w-full max-w-sm overflow-hidden rounded-2xl md:mx-0 md:aspect-square md:max-w-none md:w-full">
        {hasBlogArticleImage(article) ? (
          <Image
            src={getBlogArticleImageSrc(article)!}
            alt={article.image.alt}
            fill
            {...(article.image.src ? { placeholder: "blur" as const } : {})}
            className="object-cover"
            sizes="(max-width: 768px) 90vw, 280px"
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col justify-center md:py-2 lg:py-4">
        {category ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
            {category.titleShort ?? category.title}
          </p>
        ) : null}
        <blockquote className="mt-3 text-balance font-display text-xl leading-[1.2] tracking-[-0.03em] sm:mt-4 sm:text-2xl md:text-3xl lg:text-[2.125rem] xl:text-4xl">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <p className="mt-3 text-sm text-muted-foreground sm:mt-4">
          {article.author.name}, {article.author.job}
        </p>
        <Link
          href={href}
          className="group mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-medium underline underline-offset-4 transition hover:text-foreground/80"
        >
          Read article
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.25}
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

export function BlogQuoteCarousel({ slides }: BlogQuoteCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (slides.length === 0) return null;

  const activeSlide = slides[index] ?? slides[0];

  return (
    <section
      aria-label="Featured quotes from the blog"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.article.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: APPLE_EASE }}
          >
            <BlogQuoteSlidePanel slide={activeSlide} />
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.article.slug}
              type="button"
              aria-label={`Show quote from ${slide.article.title}`}
              aria-current={slideIndex === index ? "true" : undefined}
              onClick={() => setIndex(slideIndex)}
              className={cn(
                "h-2 rounded-full transition-all",
                slideIndex === index
                  ? "w-6 bg-foreground"
                  : "w-2 bg-foreground/20 hover:bg-foreground/35"
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
