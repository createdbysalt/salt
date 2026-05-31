import {
  SALT_ORGANIZATION,
  SALT_SOFTWARE_APPLICATION,
} from "@/app/_lib/sanity/default-structured-data";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateFAQSchema,
  generateSoftwareApplicationSchema,
} from "@/app/_components/StructuredData";

const HOMEPAGE_FAQS = [
  {
    question: "Who is Salt for?",
    answer:
      "Salt is for independent professionals who run client-shaped businesses and want their context, follow-through, and next steps prepared in one place.",
  },
  {
    question: "Is Salt another CRM or chatbot?",
    answer:
      "No. Salt is a proactive AI operating layer. It reads what changed across your business, prepares the next action, and waits for approval.",
  },
  {
    question: "Does Salt act without approval?",
    answer:
      "No. Salt is approval-first. It can draft and recommend work, but high-stakes actions stay queued for review.",
  },
  {
    question: "What does the waitlist unlock?",
    answer:
      "The waitlist is for early access to upcoming Salt cohorts as the product opens to more independent professionals.",
  },
];

/**
 * Structured data for homepage (AEO/SEO)
 * Uses native script tags for SSR compatibility
 */
export function HomePageStructuredData() {
  const organizationSchema = generateOrganizationSchema(SALT_ORGANIZATION);
  const webSiteSchema = generateWebSiteSchema(SALT_ORGANIZATION);
  const softwareSchema = generateSoftwareApplicationSchema(
    SALT_SOFTWARE_APPLICATION,
    SALT_ORGANIZATION
  );
  const faqSchema = generateFAQSchema(HOMEPAGE_FAQS);

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
