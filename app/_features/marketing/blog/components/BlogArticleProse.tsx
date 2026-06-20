import type { ReactNode } from "react";

type BlogArticleProseProps = {
  children: ReactNode;
};

/**
 * Single prose shell for all blog articles (Sanity portable text + legacy JSX).
 * Typography lives in blog-article-prose.css — do not add per-article inline styles.
 */
export function BlogArticleProse({ children }: BlogArticleProseProps) {
  return <div className="blog-article-prose">{children}</div>;
}
