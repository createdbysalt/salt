import { cache } from "react";
import { urlFor } from "@/app/_lib/sanity/image";
import { getAllAuthors } from "@/app/_lib/sanity/queries";
import type { Author } from "@/app/_lib/sanity/types";

export type ResolvedBlogAuthor = {
  slug: string;
  name: string;
  job: string;
  description: string;
  avatar: string;
};

function authorScore(author: Author): number {
  let score = 0;
  if (author._id.startsWith("author-")) score += 100;
  if (author.image?.asset) score += 10;
  if (author.bio?.trim()) score += 2;
  if (author.jobTitle?.trim()) score += 1;
  return score;
}

function pickPreferredAuthor(a: Author, b: Author): Author {
  const scoreA = authorScore(a);
  const scoreB = authorScore(b);
  return scoreA >= scoreB ? a : b;
}

function normalizeAuthorSlug(author: Author): string | undefined {
  const slug = author.slug?.current;
  if (!slug) {
    if (author.name === "Matt Martins") return "matt";
    if (author.name === "Salt Team") return "marc";
    return undefined;
  }

  if (slug === "matt-martins") return "matt";
  return slug;
}

function dedupeAuthorsBySlug(authorDocs: Author[]): Author[] {
  const bySlug = new Map<string, Author>();

  for (const author of authorDocs) {
    const slug = normalizeAuthorSlug(author);
    if (!slug) continue;

    const existing = bySlug.get(slug);
    bySlug.set(slug, existing ? pickPreferredAuthor(existing, author) : author);
  }

  return [...bySlug.values()];
}

function fromSanity(author: Author): ResolvedBlogAuthor | null {
  const slug = author.slug?.current;
  if (!slug || !author.name) return null;

  return {
    slug,
    name: author.name,
    job: author.jobTitle ?? "",
    description: author.bio ?? "",
    avatar: author.image?.asset
      ? urlFor(author.image).width(384).height(384).url()
      : "",
  };
}

export const resolveBlogAuthor = cache(
  async (slug: string): Promise<ResolvedBlogAuthor | null> => {
    const match = dedupeAuthorsBySlug(await getAllAuthors()).find(
      (author) => author.slug?.current === slug
    );

    if (!match) return null;
    return fromSanity(match);
  }
);

export async function resolveBlogAuthorSlugs(): Promise<string[]> {
  return dedupeAuthorsBySlug(await getAllAuthors())
    .map((author) => author.slug?.current)
    .filter((slug): slug is string => Boolean(slug));
}
