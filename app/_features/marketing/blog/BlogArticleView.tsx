import { Suspense } from "react";
import Script from "next/script";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { buildBlogArticleGraph } from "@/app/_lib/seo/blog-structured-data";
import { BlogArticleProse } from "./components/BlogArticleProse";
import { BlogArticleFaq } from "./components/BlogArticleFaq";
import { BlogArticleHero } from "./components/BlogArticleHero";
import { BlogArticleMetaBar } from "./components/BlogArticleMetaBar";
import { BlogArticleSidebar } from "./components/BlogArticleSidebar";
import { BlogExploreWithAi } from "./components/BlogExploreWithAi";
import { BlogRelatedArticles } from "./components/BlogRelatedArticles";
import "./blog-article-prose.css";

type BlogArticleViewProps = {
  article: articleType;
  relatedArticles: articleType[];
};

export function BlogArticleView({
  article,
  relatedArticles,
}: BlogArticleViewProps) {
  const structuredData = buildBlogArticleGraph({ article });

  return (
    <>
      <Script
        type="application/ld+json"
        id={`json-ld-article-${article.slug}`}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <BlogArticleHero article={article} />

      <section className="blog-article-body-section pb-10 pt-6 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-12">
        <Landing2Container>
          <div className="blog-article-layout min-w-0">
            <Suspense fallback={null}>
              <BlogArticleSidebar article={article} />
            </Suspense>

            <article className="blog-article-main min-w-0">
              <div className="blog-article-ai-strip mb-6 sm:mb-8 lg:mb-10">
                <BlogExploreWithAi slug={article.slug} title={article.title} />
              </div>

              <BlogArticleProse>{article.content}</BlogArticleProse>

              {article.faq?.length ? (
                <BlogArticleFaq items={article.faq} />
              ) : null}

              <div className="blog-article-ai-strip mt-10">
                <BlogExploreWithAi slug={article.slug} title={article.title} />
              </div>

              <BlogArticleMetaBar article={article} />
            </article>
          </div>

          <BlogRelatedArticles articles={relatedArticles} />
        </Landing2Container>
      </section>
    </>
  );
}
