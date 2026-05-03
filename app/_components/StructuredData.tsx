import Script from "next/script";
import type {
  OrganizationDataConfig,
  SoftwareApplicationConfig,
} from "@/app/_lib/sanity/default-structured-data";

type OrganizationData = OrganizationDataConfig;
type SoftwareApplicationData = SoftwareApplicationConfig;

interface FAQItem {
  question: string;
  answer: string;
}

interface StructuredDataProps {
  type: "organization" | "website" | "faq" | "software" | "article" | "webpage";
  organization?: OrganizationData;
  software?: SoftwareApplicationData;
  faqItems?: FAQItem[];
  article?: {
    headline: string;
    description?: string;
    image?: string;
    datePublished?: string;
    dateModified?: string;
    author?: { name: string; url?: string };
  };
  webpage?: {
    name: string;
    description?: string;
    url?: string;
  };
}

export function generateOrganizationSchema(org: OrganizationData) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    ...(org.legalName && { legalName: org.legalName }),
    ...(org.description && { description: org.description }),
    ...(org.url && { url: org.url }),
    ...(org.logo && { logo: org.logo }),
    ...(org.foundingDate && { foundingDate: org.foundingDate }),
    ...(org.founders?.length && {
      founders: org.founders.map((f) => ({
        "@type": "Person",
        name: f.name,
        ...(f.url && { url: f.url }),
      })),
    }),
    ...(org.contactEmail && {
      contactPoint: {
        "@type": "ContactPoint",
        email: org.contactEmail,
        contactType: "customer service",
      },
    }),
    ...(org.sameAs?.length && { sameAs: org.sameAs }),
  };
}

export function generateWebSiteSchema(org: OrganizationData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: org.name,
    ...(org.url && { url: org.url }),
    ...(org.description && { description: org.description }),
    publisher: {
      "@type": "Organization",
      name: org.name,
      ...(org.logo && { logo: org.logo }),
    },
  };
}

export function generateFAQSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function generateSoftwareApplicationSchema(
  software: SoftwareApplicationData,
  org?: OrganizationData
) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: software.name,
    ...(software.description && { description: software.description }),
    applicationCategory: software.applicationCategory || "BusinessApplication",
    operatingSystem: software.operatingSystem || "Web Browser",
    ...(software.offers && {
      offers: {
        "@type": "Offer",
        price: software.offers.price || 0,
        priceCurrency: software.offers.priceCurrency || "USD",
        ...(software.offers.priceValidUntil && {
          priceValidUntil: software.offers.priceValidUntil,
        }),
      },
    }),
    ...(org && {
      publisher: {
        "@type": "Organization",
        name: org.name,
        ...(org.url && { url: org.url }),
      },
    }),
  };
}

export function generateArticleSchema(article: StructuredDataProps["article"]) {
  if (!article) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    ...(article.description && { description: article.description }),
    ...(article.image && { image: article.image }),
    ...(article.datePublished && { datePublished: article.datePublished }),
    ...(article.dateModified && { dateModified: article.dateModified }),
    ...(article.author && {
      author: {
        "@type": "Person",
        name: article.author.name,
        ...(article.author.url && { url: article.author.url }),
      },
    }),
  };
}

export function generateWebPageSchema(
  webpage: StructuredDataProps["webpage"],
  org?: OrganizationData
) {
  if (!webpage) return null;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: webpage.name,
    ...(webpage.description && { description: webpage.description }),
    ...(webpage.url && { url: webpage.url }),
    ...(org && {
      publisher: {
        "@type": "Organization",
        name: org.name,
      },
    }),
  };
}

export function StructuredData({
  type,
  organization,
  software,
  faqItems,
  article,
  webpage,
}: StructuredDataProps) {
  let schema: object | null = null;

  switch (type) {
    case "organization":
      if (organization) schema = generateOrganizationSchema(organization);
      break;
    case "website":
      if (organization) schema = generateWebSiteSchema(organization);
      break;
    case "faq":
      if (faqItems?.length) schema = generateFAQSchema(faqItems);
      break;
    case "software":
      if (software) schema = generateSoftwareApplicationSchema(software, organization);
      break;
    case "article":
      schema = generateArticleSchema(article);
      break;
    case "webpage":
      schema = generateWebPageSchema(webpage, organization);
      break;
  }

  if (!schema) return null;

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function MultiStructuredData({
  schemas,
}: {
  schemas: Array<StructuredDataProps>;
}) {
  return (
    <>
      {schemas.map((props, index) => (
        <StructuredData key={`${props.type}-${index}`} {...props} />
      ))}
    </>
  );
}
