import { Linkedin } from "lucide-react";
import config from "@/config";
import { getBlogArticleHref } from "../blog-paths";

type BlogArticleShareProps = {
  title: string;
  slug: string;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SHARE_LINKS = [
  {
    label: "Share on X",
    Icon: XIcon,
    iconClassName: "size-5",
    buildUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    label: "Share on LinkedIn",
    Icon: Linkedin,
    iconClassName: "size-5",
    buildUrl: (url: string, title: string) =>
      `https://www.linkedin.com/shareArticle?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
] as const;

export function BlogArticleShare({ title, slug }: BlogArticleShareProps) {
  const pageUrl = `https://${config.domainName}${getBlogArticleHref(slug)}`;

  return (
    <div className="blog-article-share">
      <p className="blog-article-share__title">Share</p>
      <ul className="blog-article-share__list">
        {SHARE_LINKS.map((link) => {
          const Icon = link.Icon;

          return (
            <li key={link.label}>
              <a
                href={link.buildUrl(pageUrl, title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="blog-article-share__link"
              >
                <Icon className={link.iconClassName} strokeWidth={1.75} />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
