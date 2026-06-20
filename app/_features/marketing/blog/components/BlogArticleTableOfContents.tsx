import type { BlogArticleHeading } from "../blog-article-toc";

type BlogArticleTableOfContentsProps = {
  headings: BlogArticleHeading[];
};

function TocList({ headings }: { headings: BlogArticleHeading[] }) {
  return (
    <ol className="blog-article-toc__list">
      {headings.map((heading) => (
        <li key={heading.id} className="blog-article-toc__item">
          <a
            href={`#${heading.id}`}
            className="blog-article-toc__link"
            title={heading.text}
          >
            <span className="blog-article-toc__marker" aria-hidden>
              └
            </span>
            <span>{heading.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function BlogArticleTableOfContents({
  headings,
}: BlogArticleTableOfContentsProps) {
  if (!headings.length) return null;

  return (
    <>
      <details
        className="blog-article-toc blog-article-toc--collapsible lg:hidden"
        aria-label="Table of contents"
      >
        <summary className="blog-article-toc__summary">Table of contents</summary>
        <div className="blog-article-toc__panel">
          <TocList headings={headings} />
        </div>
      </details>

      <nav
        className="blog-article-toc blog-article-toc--panel hidden lg:block"
        aria-label="Table of contents"
      >
        <p className="blog-article-toc__title">Table of contents</p>
        <TocList headings={headings} />
      </nav>
    </>
  );
}
