/** Comparison article slugs — served at /compare/:slug only. */
export const COMPARE_ARTICLE_SLUGS = [
  "salt-vs-lindy",
  "salt-vs-viktor",
  "salt-vs-chatgpt",
  "salt-vs-hiring-a-va",
  "salt-alternatives",
] as const;

export type CompareArticleSlug = (typeof COMPARE_ARTICLE_SLUGS)[number];

export function isCompareArticleSlug(slug: string): slug is CompareArticleSlug {
  return (COMPARE_ARTICLE_SLUGS as readonly string[]).includes(slug);
}
