import Image from "next/image";
import Link from "next/link";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import { getBlogAuthorHref } from "../blog-paths";

type BlogArticleAuthorFooterProps = {
  article: articleType;
};

export function BlogArticleAuthorFooter({ article }: BlogArticleAuthorFooterProps) {
  const avatar = article.author.avatar;

  return (
    <footer className="mt-12 max-w-3xl border-t border-foreground/10 pt-8">
      <p className="mb-3 text-sm text-muted-foreground">Words by</p>
      <div className="flex items-start gap-4">
        {avatar ? (
          <Image
            src={avatar}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : null}
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">
            <Link
              href={getBlogAuthorHref(article.author.slug)}
              className="transition hover:text-foreground/80"
            >
              {article.author.name}
            </Link>
          </p>
          {article.author.job ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {article.author.job}
            </p>
          ) : null}
          {article.author.description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {article.author.description}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
