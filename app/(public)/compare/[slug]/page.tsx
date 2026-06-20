import { notFound } from "next/navigation";
import { CompareArticleView } from "@/app/_features/marketing/compare/CompareArticleView";
import { compareArticles } from "@/app/_features/marketing/compare/compare-content";
import { isCompareArticleSlug } from "@/app/_features/marketing/compare/compare-slugs";
import { getCompareBlogPost } from "@/app/_lib/sanity/queries";
import { getSEOTags } from "@/app/_lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isCompareArticleSlug(slug)) {
    return getSEOTags({ title: "Page Not Found" });
  }

  const sanityPost = await getCompareBlogPost(slug);
  const article = compareArticles.find((entry) => entry.slug === slug);

  if (!article && !sanityPost) {
    return getSEOTags({ title: "Page Not Found" });
  }

  const title = sanityPost?.title ?? article!.title;
  const description = sanityPost?.excerpt ?? article!.description;
  const imagePath = article?.image.urlRelative ?? `/learn/${slug}/header.png`;

  return getSEOTags({
    title,
    description,
    canonicalUrlRelative: `/compare/${slug}`,
    extraTags: {
      openGraph: {
        title,
        description,
        url: `/compare/${slug}`,
        images: [
          {
            url: imagePath,
            width: 1200,
            height: 660,
          },
        ],
        locale: "en_US",
        type: "article",
        publishedTime: article?.publishedAt ?? sanityPost?.publishedAt,
        modifiedTime: article?.publishedAt ?? sanityPost?.publishedAt,
        authors: [article?.author.name ?? sanityPost?.author?.name ?? "Salt"],
      },
    },
  });
}

export default async function CompareArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isCompareArticleSlug(slug)) {
    notFound();
  }

  const [sanityPost, article] = await Promise.all([
    getCompareBlogPost(slug),
    Promise.resolve(compareArticles.find((entry) => entry.slug === slug)),
  ]);

  if (!article) {
    notFound();
  }

  return <CompareArticleView article={article} sanityPost={sanityPost ?? undefined} />;
}
