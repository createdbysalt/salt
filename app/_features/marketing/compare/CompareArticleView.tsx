import Script from "next/script";
import { CompareArticleShell } from "@/app/_features/marketing/compare/CompareArticleShell";
import {
  buildCompareArticleMeta,
  getCompareHeroConfig,
  getStructuredCompareExtras,
} from "@/app/_features/marketing/compare/adapters/legacy-compare-article";
import {
  hasSanityCompareTemplate,
  mapSanityCompareExtras,
} from "@/app/_features/marketing/compare/adapters/sanity-compare-article";
import type { CompareArticle } from "@/app/_features/marketing/compare/compare-content";
import { getCompareArticleHref } from "@/app/_features/marketing/compare/compare-pages";
import type { BlogPost } from "@/app/_lib/sanity/types";
import config from "@/config";

export function CompareArticleView({
  article,
  sanityPost,
}: {
  article: CompareArticle;
  sanityPost?: BlogPost;
}) {
  const meta = buildCompareArticleMeta(article);
  const legacyHero = getCompareHeroConfig(article.slug, article);
  const legacyExtras = getStructuredCompareExtras(article.slug);
  const sanityExtras =
    sanityPost && hasSanityCompareTemplate(sanityPost)
      ? mapSanityCompareExtras(sanityPost, article.slug)
      : null;

  const hero = sanityExtras?.hero ?? legacyHero;
  const table = sanityExtras?.table ?? legacyExtras.table;
  const hiddenCosts = sanityExtras?.hiddenCosts ?? legacyExtras.hiddenCosts;
  const narrative = sanityExtras?.narrative ?? legacyExtras.narrative;
  const userReviews = sanityExtras?.userReviews ?? legacyExtras.userReviews;
  const alternativesGrid =
    sanityExtras?.alternativesGrid ?? legacyExtras.alternativesGrid;
  const faq = sanityExtras?.faq ?? legacyExtras.faq;
  const pageUrl = `https://${config.domainName}${getCompareArticleHref(article.slug)}`;

  return (
    <>
      <Script
        type="application/ld+json"
        id={`json-ld-article-${article.slug}`}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": pageUrl,
            },
            name: article.title,
            headline: hero?.headline ?? article.title,
            description: hero?.thesis ?? article.description,
            image: hero
              ? `https://${config.domainName}${hero.heroImageSrc}`
              : `https://${config.domainName}${article.image.urlRelative}`,
            datePublished: article.publishedAt,
            dateModified: article.publishedAt,
            author: {
              "@type": "Person",
              name: article.author.name,
            },
            publisher: {
              "@type": "Organization",
              name: "Salt",
              logo: {
                "@type": "ImageObject",
                url: `https://${config.domainName}/logo.png`,
              },
            },
          }),
        }}
      />

      {faq && faq.length > 0 ? (
        <Script
          type="application/ld+json"
          id={`json-ld-faq-${article.slug}`}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            }),
          }}
        />
      ) : null}

      <CompareArticleShell
        meta={meta}
        hero={hero}
        table={table}
        narrative={narrative}
        userReviews={userReviews}
        hiddenCosts={hiddenCosts}
        alternativesGrid={alternativesGrid}
        faq={faq}
      >
        {article.content}
      </CompareArticleShell>
    </>
  );
}
