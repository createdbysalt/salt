import type { StaticImageData } from "next/image";
import type { articleType } from "@/app/(public)/learn/_assets/content";

export type { articleType, categoryType, authorType } from "./blog-types";

export function getBlogArticleImageSrc(
  article: articleType
): string | StaticImageData | undefined {
  return article.image.src ?? article.image.urlRelative;
}

export function hasBlogArticleImage(article: articleType): boolean {
  const src = getBlogArticleImageSrc(article);
  return typeof src === "string" ? Boolean(src.trim()) : Boolean(src);
}

export function sortArticlesByDate(list: articleType[]): articleType[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function filterArticlesByCategory(
  list: articleType[],
  categorySlug: string | null | undefined
): articleType[] {
  if (!categorySlug) return list;
  return list.filter((article) =>
    article.categories.some((category) => category.slug === categorySlug)
  );
}

export function filterArticlesBySearch(
  list: articleType[],
  query: string | null | undefined
): articleType[] {
  const trimmed = query?.trim();
  if (!trimmed) return list;

  const needle = trimmed.toLowerCase();
  return list.filter(
    (article) =>
      article.title.toLowerCase().includes(needle) ||
      article.description.toLowerCase().includes(needle) ||
      article.author.name.toLowerCase().includes(needle) ||
      article.categories.some((category) =>
        category.title.toLowerCase().includes(needle)
      )
  );
}

export function formatBlogDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBlogDateShort(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getPrimaryCategory(article: articleType) {
  return article.categories[0] ?? null;
}
