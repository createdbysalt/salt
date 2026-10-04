import type { Metadata } from "next";
import { SALT_SOCIAL, SALT_SOCIAL_SAME_AS } from "@/app/_lib/seo/social-links";
import config from "../../../config";

const siteUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/"
    : `https://${config.domainName}/`;

type SeoInput = Metadata & {
  /** Relative canonical path, e.g. "/pricing". Resolved against metadataBase. */
  canonicalUrlRelative?: string;
  /** Escape hatch for page-specific metadata fields not modeled here. */
  extraTags?: Record<string, unknown>;
};

/**
 * Build the Next.js `Metadata` object for a page, filling in site-wide defaults
 * (title, description, Open Graph, Twitter card) so each page only states what
 * differs. Pages pass `canonicalUrlRelative` so canonical links stay correct
 * across environments.
 */
export function getSEOTags(input: SeoInput = {}): Metadata {
  const { title, description, keywords, openGraph, canonicalUrlRelative, extraTags } = input;
  const resolvedTitle = title ?? config.appName;
  const resolvedDescription = description ?? config.appDescription;
  const ogTitle = openGraph?.title ?? config.appName;
  const ogDescription = openGraph?.description ?? config.appDescription;

  const metadata: Metadata = {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: keywords ?? [config.appName],
    applicationName: config.appName,
    metadataBase: new URL(siteUrl),
    appleWebApp: { capable: true, title: config.appName, statusBarStyle: "default" },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: openGraph?.url ?? siteUrl,
      siteName: config.appName,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      creator: `@${SALT_SOCIAL.xHandle}`,
    },
    verification: {
      other: { "facebook-domain-verification": "vqj9ti8kgclnjb74axaf7v5mkcp860" },
    },
  };

  if (canonicalUrlRelative) {
    metadata.alternates = { canonical: canonicalUrlRelative };
  }

  return { ...metadata, ...(extraTags as Partial<Metadata> | undefined) };
}

/**
 * JSON-LD describing Salt as a software application, for rich results.
 * Rendered once from the marketing layout.
 */
export function renderSchemaTags() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: config.appName,
    description: config.appDescription,
    image: `https://${config.domainName}/icon.png`,
    url: `https://${config.domainName}/`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    datePublished: "2026-02-01",
    author: {
      "@type": "Organization",
      name: "Salt Studio LLC",
      url: `https://${config.domainName}/`,
      sameAs: [...SALT_SOCIAL_SAME_AS],
    },
    creator: { "@type": "Person", name: "Gabriella Martins", jobTitle: "Founder & CEO" },
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Join waitlist for early access",
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
