import type { articleType } from "@/app/(public)/learn/_assets/content";
import { fetchResolvedBlogNewsletterForm } from "../blog-newsletter-form-config";
import { extractMarkdownHeadings } from "../blog-article-toc";
import { BlogArticleAuthorCard } from "./BlogArticleAuthorCard";
import { BlogArticleNewsletterSignup } from "./BlogArticleNewsletterSignup";
import { BlogArticleShare } from "./BlogArticleShare";
import { BlogArticleSidebarStickyInner } from "./BlogArticleSidebarStickyInner";
import { BlogArticleTableOfContents } from "./BlogArticleTableOfContents";

type BlogArticleSidebarProps = {
  article: articleType;
};

export async function BlogArticleSidebar({ article }: BlogArticleSidebarProps) {
  const headings = article.bodyMarkdown
    ? extractMarkdownHeadings(article.bodyMarkdown)
    : [];
  const newsletterForm = await fetchResolvedBlogNewsletterForm();

  return (
    <aside className="blog-article-sidebar" aria-label="Article tools">
      <div className="blog-article-sidebar__scroll">
        <BlogArticleAuthorCard article={article} />
        <BlogArticleTableOfContents headings={headings} />
      </div>

      <BlogArticleSidebarStickyInner>
        <BlogArticleShare title={article.title} slug={article.slug} />
        <BlogArticleNewsletterSignup
          articleSlug={article.slug}
          form={newsletterForm}
        />
      </BlogArticleSidebarStickyInner>
    </aside>
  );
}
