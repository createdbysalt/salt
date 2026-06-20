import { cache } from "react";
import { createElement } from "react";
import type { categoryType } from "@/app/(public)/learn/_assets/content";
import { COMPARE_ARTICLE_SLUGS } from "@/app/_features/marketing/compare/compare-slugs";
import { getAllBlogPosts, getBlogPost } from "@/app/_lib/sanity/queries";
import type { BlogPost, SanityImage } from "@/app/_lib/sanity/types";
import { urlFor } from "@/app/_lib/sanity/image";
import { PortableTextProse } from "@/app/_lib/sanity/portable-text-prose";
import { portableTextToMarkdown } from "@/app/_lib/seo/blog-markdown-export";
import { extractYoutubeEmbedsFromPortableText } from "@/app/_lib/seo/extract-youtube-embeds";
import { normalizeBlogArticleBody } from "./blog-article-body-normalize";
import { normalizeBlogPlainText, parseBlogExcerpt } from "./blog-display-text";
import { dedupeBlogPostsBySlug } from "@/app/_lib/sanity/blog-dedupe";
import { getLegacyCategorySlug } from "./blog-category-config";
import { resolveBlogCategories } from "./blog-category-data";
import type { BlogArticle } from "./blog-types";
import { sortArticlesByDate } from "./blog-utils";

const COMPARE_SLUGS = new Set<string>(COMPARE_ARTICLE_SLUGS);

function isMarketingArticle(post: BlogPost): boolean {
  return post.articleKind !== "comparison" && post.articleKind !== "guide";
}

function mapCategory(
  post: BlogPost,
  categories: Awaited<ReturnType<typeof resolveBlogCategories>>
): categoryType[] {
  const routeSlug = post.category?.slug?.current;
  const resolved = routeSlug
    ? categories.find((category) => category.routeSlug === routeSlug)
    : undefined;

  if (resolved) {
    return [
      {
        slug: resolved.legacySlug,
        title: resolved.title,
        titleShort: resolved.titleShort,
        description: resolved.description,
      },
    ];
  }

  if (!routeSlug) return [];

  const legacySlug =
    post.category?.legacyArticleSlug ??
    getLegacyCategorySlug(routeSlug) ??
    routeSlug;

  return [
    {
      slug: legacySlug,
      title: post.category?.title ?? routeSlug,
      titleShort: post.category?.titleShort,
      description: post.category?.description ?? "",
    },
  ];
}

function resolveAuthorAvatar(post: BlogPost): string {
  if (!post.author?.image?.asset) return "";
  return urlFor(post.author.image).width(128).height(128).url();
}

function pickPostImage(post: BlogPost): SanityImage | undefined {
  if (post.featuredImage?.asset) return post.featuredImage;
  if (post.seo?.image?.asset) return post.seo.image;
  return undefined;
}

function resolveFeaturedImage(post: BlogPost): BlogArticle["image"] {
  const image = pickPostImage(post);

  if (!image?.asset) {
    return { urlRelative: "", alt: post.title };
  }

  return {
    urlRelative: urlFor(image).width(1200).height(660).url(),
    alt: image.alt ?? post.title,
  };
}

function resolveMetaImage(post: BlogPost): string | undefined {
  if (!post.seo?.image?.asset) return undefined;
  return urlFor(post.seo.image).width(1200).height(660).url();
}

function mapFaq(post: BlogPost): BlogArticle["faq"] {
  const items = post.articleFaq?.items ?? [];
  return items
    .filter((item) => item.question && item.answer)
    .map((item) => ({
      question: item.question,
      answer: item.answer,
    }));
}

function mapRelatedSlugs(post: BlogPost): string[] {
  return (
    post.relatedPosts
      ?.map((entry) => entry.slug?.current)
      .filter((entry): entry is string => Boolean(entry)) ?? []
  );
}

function mapSanityPostToArticle(
  post: BlogPost,
  categories: Awaited<ReturnType<typeof resolveBlogCategories>>
): BlogArticle {
  const slug = post.slug.current;
  const normalizedBody = normalizeBlogArticleBody(slug, post.body);
  const body = normalizedBody?.length
    ? createElement(PortableTextProse, { value: normalizedBody })
    : createElement("div");

  const faq = mapFaq(post);
  const bodyMarkdown = normalizedBody?.length
    ? portableTextToMarkdown(normalizedBody)
    : undefined;
  const videoEmbeds = extractYoutubeEmbedsFromPortableText(normalizedBody);
  const dek = parseBlogExcerpt(post.excerpt ?? "");
  const description = normalizeBlogPlainText(
    [dek.lead, dek.rest].filter(Boolean).join(" ")
  );

  return {
    slug,
    title: post.title,
    description,
    dek,
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    updatedAt: post.updatedAt,
    keyTakeaways: post.keyTakeaways?.map((item) => normalizeBlogPlainText(item)),
    faq: faq?.length ? faq : undefined,
    bodyMarkdown,
    relatedSlugs: mapRelatedSlugs(post),
    videoEmbeds: videoEmbeds.length ? videoEmbeds : undefined,
    metaTitle: post.seo?.title,
    metaDescription: post.seo?.description
      ? normalizeBlogPlainText(post.seo.description)
      : undefined,
    metaImage: resolveMetaImage(post),
    noIndex: post.seo?.noIndex,
    author: {
      slug: post.author?.slug?.current ?? "",
      name: post.author?.name ?? "",
      job: post.author?.jobTitle ?? "",
      description: post.author?.bio
        ? normalizeBlogPlainText(post.author.bio)
        : "",
      avatar: resolveAuthorAvatar(post),
    },
    categories: mapCategory(post, categories),
    image: resolveFeaturedImage(post),
    content: body,
  };
}

export const resolveBlogArticles = cache(async (): Promise<BlogArticle[]> => {
  const categories = await resolveBlogCategories();
  const sanityPosts = dedupeBlogPostsBySlug(
    (await getAllBlogPosts()).filter(isMarketingArticle)
  );

  return sortArticlesByDate(
    sanityPosts.map((post) => mapSanityPostToArticle(post, categories))
  );
});

export const resolveBlogArticle = cache(
  async (slug: string): Promise<BlogArticle | null> => {
    if (COMPARE_SLUGS.has(slug)) return null;

    const post = await getBlogPost(slug);
    if (!post || !isMarketingArticle(post)) return null;

    const categories = await resolveBlogCategories();
    return mapSanityPostToArticle(post, categories);
  }
);

export async function resolveBlogArticleSlugs(): Promise<string[]> {
  const articles = await resolveBlogArticles();
  return articles.map((article) => article.slug);
}
