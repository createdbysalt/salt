import {
  SALT_ORGANIZATION,
  SALT_SOFTWARE_APPLICATION,
} from "@/app/_lib/sanity/default-structured-data";
import type { HomepageStructuredDataFaq } from "@/app/_lib/sanity/types";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateFAQSchema,
  generateSoftwareApplicationSchema,
} from "@/app/_components/StructuredData";
import { HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK } from "@/app/_features/marketing/landing2/homepage-structured-data-fallback";

type HomePageStructuredDataProps = {
  faqs?: HomepageStructuredDataFaq[];
};

/**
 * Structured data for homepage (AEO/SEO)
 * Uses native script tags for SSR compatibility
 */
export function HomePageStructuredData({
  faqs = HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK,
}: HomePageStructuredDataProps) {
  const organizationSchema = generateOrganizationSchema(SALT_ORGANIZATION);
  const webSiteSchema = generateWebSiteSchema(SALT_ORGANIZATION);
  const softwareSchema = generateSoftwareApplicationSchema(
    SALT_SOFTWARE_APPLICATION,
    SALT_ORGANIZATION
  );
  const faqSchema = generateFAQSchema(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
