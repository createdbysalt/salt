import Image from "next/image";
import Link from "next/link";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import { getBlogAuthorHref } from "../blog-paths";

type BlogArticleAuthorCardProps = {
  article: articleType;
};

export function BlogArticleAuthorCard({ article }: BlogArticleAuthorCardProps) {
  const { author } = article;

  return (
    <div className="blog-article-author-card">
      <div className="flex items-start gap-3">
        {author.avatar ? (
          <Image
            src={author.avatar}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <Link
            href={getBlogAuthorHref(author.slug)}
            className="font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground no-underline transition hover:text-foreground/75"
          >
            {author.name}
          </Link>
          {author.job ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{author.job}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
