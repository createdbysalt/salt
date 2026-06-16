import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { cn } from "@repo/utils";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import { Landing2WaitlistSection } from "@/app/_features/marketing/landing2/Landing2WaitlistSection";
import "@/app/_features/marketing/landing2/landing2.css";
import "./compare-article-prose.css";
import { CompareLogoPair } from "./components/CompareLogoPair";
import { CompareDetailHero } from "./components/CompareDetailHero";
import { CompareFeatureTable } from "./components/CompareFeatureTable";
import { CompareFaqSection } from "./components/CompareFaqSection";
import { CompareNarrative } from "./components/CompareNarrative";
import { CompareHiddenCostsSection } from "./components/CompareHiddenCostsSection";
import { CompareUserReviewsSection } from "./components/CompareUserReviewsSection";
import { CompareAlternativesGrid } from "./components/CompareAlternativesGrid";
import type { CompareArticleShellProps } from "./types";

function LegacyCompareHeader({ meta }: Pick<CompareArticleShellProps, "meta">) {
  const publishedLabel = new Date(meta.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="border-b border-foreground/8 pb-10 pt-8 sm:pb-12 sm:pt-10">
      <Landing2Container>
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
        >
          <Link href="/compare" className="transition hover:text-foreground">
            Compare
          </Link>
          <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
          <span className="text-foreground">{meta.title}</span>
        </nav>

        <div className="mt-8 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.04] px-3 py-1 text-xs font-medium text-foreground/65">
              {meta.kind === "versus" ? "Comparison" : "Guide"}
            </span>
            <span className="text-sm text-muted-foreground">{publishedLabel}</span>
            <span className="text-sm text-muted-foreground">· {meta.authorName}</span>
          </div>

          {meta.kind === "versus" && (
            <CompareLogoPair competitorSlug={meta.competitorSlug} className="mt-6" />
          )}

          <h1 className="font-display mt-5 text-balance text-[2rem] leading-[1.08] tracking-[-0.03em] sm:text-[40px] sm:leading-[1.1] lg:text-[48px]">
            {meta.title}
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
            {meta.description}
          </p>
        </div>

        {meta.heroImageSrc && (
          <div className="relative mt-10 aspect-[16/10] max-w-4xl overflow-hidden rounded-2xl border border-foreground/10 bg-muted/30">
            <Image
              src={meta.heroImageSrc}
              alt={meta.heroImageAlt ?? meta.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        )}
      </Landing2Container>
    </section>
  );
}

export function CompareArticleShell({
  meta,
  hero,
  table,
  narrative,
  userReviews,
  hiddenCosts,
  alternativesGrid,
  faq,
  children,
}: CompareArticleShellProps) {
  const hasFaq = faq !== undefined && faq.length > 0;

  return (
    <div className="landing2-home">
      <main className="min-h-screen bg-background">
        <Landing2NavServer />

        {hero ? (
          <CompareDetailHero hero={hero} />
        ) : (
          <LegacyCompareHeader meta={meta} />
        )}

        <section
          className={cn(
            "pt-8 sm:pt-12 lg:pt-16",
            hasFaq ? "pb-6 sm:pb-10" : "pb-12 sm:pb-16 lg:pb-20",
          )}
        >
          <Landing2Container>
            <div className="min-w-0 space-y-8 sm:space-y-10 lg:space-y-12">
              {table && table.rows.length > 0 ? (
                <CompareFeatureTable
                  competitorLabel={table.competitorLabel}
                  competitorSlug={table.competitorSlug ?? meta.competitorSlug}
                  rows={table.rows}
                />
              ) : null}

              {alternativesGrid ? (
                <CompareAlternativesGrid grid={alternativesGrid} />
              ) : null}

              {hiddenCosts ? <CompareHiddenCostsSection hiddenCosts={hiddenCosts} /> : null}

              {narrative ? <CompareNarrative narrative={narrative} /> : null}

              {userReviews ? <CompareUserReviewsSection reviews={userReviews} /> : null}

              {!narrative ? (
                <div
                  className={`compare-article-prose min-w-0 ${hero || table || faq ? "compare-article-prose--structured" : ""}`}
                >
                  {children}
                </div>
              ) : null}

              {hasFaq ? <CompareFaqSection items={faq} /> : null}
            </div>
          </Landing2Container>
        </section>

        <Landing2WaitlistSection />
      </main>
      <Landing2FooterServer />
    </div>
  );
}
