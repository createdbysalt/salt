import config from "@/config";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import { toAbsoluteBlogImageUrl } from "@/app/_features/marketing/blog/blog-image-url";
import { getCategoryRouteSlug } from "@/app/_features/marketing/blog/blog-category-config";
import {
  getBlogArticleHref,
  getBlogCategoryHref,
  getBlogHubHref,
} from "@/app/_features/marketing/blog/blog-paths";

const BASE_URL = `https://${config.domainName}`;

export type BlogArticleStructuredDataInput = {
  article: articleType;
  wordCount?: number;
};

function articlePageId(slug: string): string {
  return `${BASE_URL}${getBlogArticleHref(slug)}`;
}

function articleEntityId(slug: string): string {
  return `${articlePageId(slug)}#article`;
}

function breadcrumbId(slug: string): string {
  return `${articlePageId(slug)}#breadcrumb`;
}

function imageId(slug: string): string {
  return `${articlePageId(slug)}#primaryimage`;
}

function authorId(authorSlug: string): string {
  return `${BASE_URL}/blog/author/${authorSlug}#person`;
}

export function buildBlogArticleGraph({
  article,
  wordCount,
}: BlogArticleStructuredDataInput): object {
  const pageUrl = articlePageId(article.slug);
  const primaryCategory = article.categories[0];
  const categoryRoute = primaryCategory
    ? getCategoryRouteSlug(primaryCategory.slug)
    : null;
  const imageUrl = toAbsoluteBlogImageUrl(article.image.urlRelative);
  const modified = article.updatedAt ?? article.publishedAt;

  const breadcrumbItems: object[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Blog",
      item: `${BASE_URL}${getBlogHubHref()}`,
    },
  ];

  if (primaryCategory && categoryRoute) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: primaryCategory.titleShort ?? primaryCategory.title,
      item: `${BASE_URL}${getBlogCategoryHref(categoryRoute)}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: article.title,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: article.title,
    });
  }

  const graph: object[] = [
    {
      "@type": "BlogPosting",
      "@id": articleEntityId(article.slug),
      isPartOf: { "@id": pageUrl },
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: modified,
      url: pageUrl,
      mainEntityOfPage: { "@id": pageUrl },
      image: { "@id": imageId(article.slug) },
      thumbnailUrl: imageUrl,
      inLanguage: "en-US",
      ...(wordCount ? { wordCount } : {}),
      ...(primaryCategory
        ? {
            articleSection: [
              primaryCategory.titleShort ?? primaryCategory.title,
            ],
          }
        : {}),
      author: {
        "@type": "Person",
        name: article.author.name,
        "@id": authorId(article.author.slug),
      },
      publisher: {
        "@type": "Organization",
        name: config.appName,
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
      },
    },
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: `${article.title} | ${config.appName} Blog`,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: modified,
      inLanguage: "en-US",
      isPartOf: { "@id": `${BASE_URL}${getBlogHubHref()}#website` },
      primaryImageOfPage: { "@id": imageId(article.slug) },
      breadcrumb: { "@id": breadcrumbId(article.slug) },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [
          ".speakable-blog-headline",
          ".speakable-blog-dek",
          ".speakable-blog-takeaway",
        ],
      },
    },
    {
      "@type": "ImageObject",
      "@id": imageId(article.slug),
      url: imageUrl,
      contentUrl: imageUrl,
      caption: article.image.alt,
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId(article.slug),
      itemListElement: breadcrumbItems,
    },
    {
      "@type": "Person",
      "@id": authorId(article.author.slug),
      name: article.author.name,
      url: `${BASE_URL}/blog/author/${article.author.slug}`,
      ...(article.author.job ? { jobTitle: article.author.job } : {}),
      ...(article.author.description
        ? { description: article.author.description }
        : {}),
    },
  ];

  if (article.faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: article.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  if (article.videoEmbeds?.length) {
    for (const [index, embed] of article.videoEmbeds.entries()) {
      const videoId = `${pageUrl}#video-${embed.videoId}`;
      graph.push({
        "@type": "VideoObject",
        "@id": videoId,
        name: embed.name ?? article.title,
        description: article.description,
        thumbnailUrl: `https://i.ytimg.com/vi/${embed.videoId}/hqdefault.jpg`,
        uploadDate: article.publishedAt,
        embedUrl: `https://www.youtube.com/embed/${embed.videoId}`,
        contentUrl: embed.url,
        url: embed.url,
        ...(index === 0
          ? {
              isPartOf: { "@id": articleEntityId(article.slug) },
            }
          : {}),
      });
    }
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildBlogCategoryGraph({
  title,
  description,
  routeSlug,
  articles,
}: {
  title: string;
  description: string;
  routeSlug: string;
  articles: articleType[];
}): object {
  const pageUrl = `${BASE_URL}${getBlogCategoryHref(routeSlug)}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${title} | ${config.appName} Blog`,
        description,
        inLanguage: "en-US",
        isPartOf: { "@id": `${BASE_URL}${getBlogHubHref()}#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: articles.length,
          itemListElement: articles.map((article, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${BASE_URL}${getBlogArticleHref(article.slug)}`,
            name: article.title,
          })),
        },
      },
    ],
  };
}

export function buildBlogAuthorGraph({
  name,
  job,
  description,
  slug,
  articles,
}: {
  name: string;
  job?: string;
  description?: string;
  slug: string;
  articles: articleType[];
}): object {
  const pageUrl = `${BASE_URL}/blog/author/${slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${name} | ${config.appName} Blog`,
        description: description ?? job,
        mainEntity: {
          "@type": "Person",
          "@id": `${pageUrl}#person`,
          name,
          ...(job ? { jobTitle: job } : {}),
          ...(description ? { description } : {}),
          url: pageUrl,
        },
      },
      {
        "@type": "ItemList",
        numberOfItems: articles.length,
        itemListElement: articles.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${BASE_URL}${getBlogArticleHref(article.slug)}`,
          name: article.title,
        })),
      },
    ],
  };
}
