import type { LandingPage, PageSection, FAQSection } from "./types";
import type {
  OrganizationDataConfig,
  SoftwareApplicationConfig,
} from "./default-structured-data";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateFAQSchema,
  generateSoftwareApplicationSchema,
} from "@/app/_components/StructuredData";

interface SiteSettingsStructuredData {
  organization?: OrganizationDataConfig;
  softwareApplication?: SoftwareApplicationConfig;
}

function extractFAQsFromPage(sections: PageSection[]): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  for (const section of sections) {
    if (section._type === "faqSection") {
      const faqSection = section as FAQSection;
      if (faqSection.items) {
        for (const item of faqSection.items) {
          if (item.question && item.answer) {
            faqs.push({
              question: item.question,
              answer: item.answer,
            });
          }
        }
      }
    }
  }

  return faqs;
}

export function generatePageStructuredData(
  page: LandingPage,
  siteSettings?: SiteSettingsStructuredData,
  baseUrl: string = "https://usesalt.io"
): object[] {
  const schemas: object[] = [];
  const isHomepage = page.slug?.current === "home";

  // 1. Organization schema (on homepage)
  if (isHomepage && siteSettings?.organization) {
    schemas.push(generateOrganizationSchema(siteSettings.organization));
  }

  // 2. WebSite schema (on homepage)
  if (isHomepage && siteSettings?.organization) {
    schemas.push(generateWebSiteSchema(siteSettings.organization));
  }

  // 3. SoftwareApplication schema (on homepage)
  if (isHomepage && siteSettings?.softwareApplication) {
    schemas.push(
      generateSoftwareApplicationSchema(
        siteSettings.softwareApplication,
        siteSettings.organization
      )
    );
  }

  // 4. FAQPage schema (if page has FAQ sections)
  if (page.pageBuilder) {
    const faqs = extractFAQsFromPage(page.pageBuilder);
    if (faqs.length > 0) {
      schemas.push(generateFAQSchema(faqs));
    }
  }

  // 5. WebPage schema (for non-homepage pages)
  if (!isHomepage) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      ...(page.seo?.description && { description: page.seo.description }),
      url: `${baseUrl}/${page.slug?.current}`,
      ...(siteSettings?.organization && {
        publisher: {
          "@type": "Organization",
          name: siteSettings.organization.name,
        },
      }),
    });
  }

  return schemas;
}

export function generateBlogPostStructuredData(
  post: {
    title: string;
    excerpt?: string;
    publishedAt: string;
    slug: { current: string };
    author?: { name: string };
    featuredImage?: { asset?: { url?: string } };
  },
  siteSettings?: SiteSettingsStructuredData,
  baseUrl: string = "https://usesalt.io"
): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.excerpt && { description: post.excerpt }),
    ...(post.featuredImage?.asset?.url && { image: post.featuredImage.asset.url }),
    datePublished: post.publishedAt,
    url: `${baseUrl}/learn/${post.slug.current}`,
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
}

export function renderStructuredDataScripts(schemas: object[]): string {
  return schemas
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join("\n");
}
