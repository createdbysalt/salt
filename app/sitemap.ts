import { MetadataRoute } from "next";
import { COMPARE_ARTICLE_SLUGS } from "@/app/_features/marketing/compare/compare-slugs";
import { client } from "@/app/_lib/sanity/client";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://usesalt.io";

type SitemapEntry = MetadataRoute.Sitemap[number];

/** Legacy marketing slugs — kept out of sitemap until pages are redesigned. */
const SITEMAP_EXCLUDED_LANDING_SLUGS = new Set(["features", "about", "changelog"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/waitlist`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/money-on-the-table`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/early-access`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/tos`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/dpa`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let landingPages: SitemapEntry[] = [];

  try {
    const pages = await client.fetch<{ slug: string; _updatedAt: string }[]>(
      `*[_type == "landingPage" && defined(slug.current) && slug.current != "home"]{
          "slug": slug.current,
          _updatedAt
        }`,
      {},
      { next: { revalidate: 3600 } }
    );

    landingPages = (pages || [])
      .filter((page) => !SITEMAP_EXCLUDED_LANDING_SLUGS.has(page.slug))
      .map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: new Date(page._updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    // Sanity not configured yet - use static pages only
  }

  return [
    ...staticPages,
    ...COMPARE_ARTICLE_SLUGS.map((slug) => ({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...landingPages,
  ];
}
