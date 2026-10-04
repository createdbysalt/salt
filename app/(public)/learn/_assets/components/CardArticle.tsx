import Image from "next/image";
import Link from "next/link";
import type { JSX } from "react";
import type { articleType } from "../content";
import Avatar from "./Avatar";
import BadgeCategory from "./BadgeCategory";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/** Article preview card used on the index, category, and author pages. */
export default function CardArticle({
  article,
  tag = "h2",
  showCategory = true,
  isImagePriority = false,
}: {
  article: articleType;
  tag?: keyof JSX.IntrinsicElements;
  showCategory?: boolean;
  isImagePriority?: boolean;
}) {
  const Heading = tag;
  const href = `/learn/${article.slug}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {article.image?.src ? (
        <Link href={href} rel="bookmark" className="block overflow-hidden">
          <Image
            src={article.image.src}
            alt={article.image.alt}
            width={600}
            height={338}
            priority={isImagePriority}
            className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
          />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-6">
        {showCategory && article.categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {article.categories.map((category) => (
              <BadgeCategory key={category.slug} category={category} />
            ))}
          </div>
        ) : null}

        <Heading className="text-xl font-semibold tracking-tight md:text-2xl">
          <Link href={href} rel="bookmark" className="hover:underline">
            {article.title}
          </Link>
        </Heading>

        <p className="text-muted-foreground">{article.description}</p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-2 text-sm text-muted-foreground">
          <Avatar article={article} />
          <time dateTime={article.publishedAt} itemProp="datePublished">
            {formatDate(article.publishedAt)}
          </time>
        </div>
      </div>
    </article>
  );
}
