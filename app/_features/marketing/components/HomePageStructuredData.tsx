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

/**
 * FAQ items from homepage v5 copy
 * These generate FAQPage schema for AEO
 */
const HOMEPAGE_FAQS = [
  {
    question: "Is this for developers or designers?",
    answer:
      "Both. Salt is for independent professionals who build client work—whether you're writing code from scratch or building with AI tools. If you run a studio, agency, consultancy, or practice, this is for you.",
  },
  {
    question: "What if I already use Bonsai/HoneyBook?",
    answer:
      "Those tools make you write proposals from scratch. Salt drafts them from your meetings. Use them together, or let Salt handle everything.",
  },
  {
    question: "How does the AI proposal work?",
    answer:
      "Salt's notetaker joins your discovery calls (with your branding, not ours). After the call, AI extracts what the client needs, matches it to your services, and drafts a proposal with terms included. You review section-by-section, adjust if needed, and send. Client signs and pays in one flow.",
  },
  {
    question: "Pre-revenue—why should I trust this?",
    answer:
      "Fair question. We use this daily. 2 clients closed using the proposal flow alone. We're transparent about what's ready, building, and planned. No vaporware.",
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
