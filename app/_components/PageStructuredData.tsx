import Script from "next/script";
import type { LandingPage } from "@/app/_lib/sanity/types";
import { generatePageStructuredData } from "@/app/_lib/sanity/structured-data";
import {
  getStructuredDataConfig,
  type OrganizationDataConfig,
  type SoftwareApplicationConfig,
} from "@/app/_lib/sanity/default-structured-data";

interface SiteSettingsData {
  organization?: OrganizationDataConfig;
  softwareApplication?: SoftwareApplicationConfig;
}

interface PageStructuredDataProps {
  page: LandingPage;
  siteSettings?: SiteSettingsData;
  baseUrl?: string;
}

export function PageStructuredData({
  page,
  siteSettings,
  baseUrl = "https://usesalt.io",
}: PageStructuredDataProps) {
  // Merge with defaults if site settings don't have structured data
  const config = getStructuredDataConfig(siteSettings);
  const schemas = generatePageStructuredData(page, config, baseUrl);

  if (schemas.length === 0) return null;

  return (
    <>
      {schemas.map((schema, index) => (
        <Script
          key={`structured-data-${index}`}
          id={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

interface BlogPostStructuredDataProps {
  post: {
    title: string;
    excerpt?: string;
    publishedAt: string;
    slug: { current: string };
    author?: { name: string };
    featuredImage?: { asset?: { url?: string } };
  };
  siteSettings?: SiteSettingsData;
  baseUrl?: string;
}

export function BlogPostStructuredData({
  post,
  siteSettings,
  baseUrl = "https://usesalt.io",
}: BlogPostStructuredDataProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.excerpt && { description: post.excerpt }),
    ...(post.featuredImage?.asset?.url && { image: post.featuredImage.asset.url }),
    datePublished: post.publishedAt,
    url: `${baseUrl}/blog/${post.slug.current}`,
    ...(post.author && {
      author: {
        "@type": "Person",
        name: post.author.name,
      },
    }),
    ...(siteSettings?.organization && {
      publisher: {
        "@type": "Organization",
        name: siteSettings.organization.name,
        ...(siteSettings.organization.logo && { logo: siteSettings.organization.logo }),
      },
    }),
  };

  return (
    <Script
      id="blog-post-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
