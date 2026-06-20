import {
  SALT_ORGANIZATION,
  SALT_SOFTWARE_APPLICATION,
} from "@/app/_lib/sanity/default-structured-data";
import type { HomepageStructuredDataFaq } from "@/app/_lib/sanity/types";
import {
  generateFAQSchema,
  generateSoftwareApplicationSchema,
} from "@/app/_components/StructuredData";
import {
  type SegmentLandingSlug,
  segmentLandingPath,
} from "./segment-landings";
import { resolveSegmentStructuredDataFaqs } from "./segment-structured-data-fallback";

const SITE_ORIGIN = "https://usesalt.io";

type SegmentLandingStructuredDataProps = {
  slug: SegmentLandingSlug;
  title: string;
  description: string;
  faqs?: HomepageStructuredDataFaq[] | null;
};

export function SegmentLandingStructuredData({
  slug,
  title,
  description,
  faqs,
}: SegmentLandingStructuredDataProps) {
  const pageUrl = `${SITE_ORIGIN}${segmentLandingPath(slug)}`;
  const resolvedFaqs = resolveSegmentStructuredDataFaqs(slug, faqs);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": pageUrl,
    url: pageUrl,
    name: title,
    description,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: SALT_ORGANIZATION.name,
      url: SALT_ORGANIZATION.url,
    },
    publisher: {
      "@type": "Organization",
      name: SALT_ORGANIZATION.name,
      url: SALT_ORGANIZATION.url,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: pageUrl,
      },
    ],
  };

  const faqSchema = generateFAQSchema(resolvedFaqs);
  const softwareSchema = generateSoftwareApplicationSchema(
    {
      ...SALT_SOFTWARE_APPLICATION,
      description,
    },
    SALT_ORGANIZATION
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </>
  );
}
