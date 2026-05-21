/**
 * Default structured data for Salt
 * Used for AEO/SEO until the full schema is deployed to Sanity
 *
 * This data is used by PageStructuredData component to generate JSON-LD
 */

export const SALT_ORGANIZATION = {
  name: "Salt",
  legalName: "Simcoe House Inc.",
  description:
    "The strategic intelligence system that transforms developers and designers into strategic studio owners who win premium projects.",
  url: "https://usesalt.io",
  logo: "https://usesalt.io/logo.png",
  foundingDate: "2025",
  founders: [
    {
      name: "Gabriella Martins",
      url: "https://linkedin.com/in/gabriellamartins",
    },
  ],
  contactEmail: "hello@usesalt.io",
  sameAs: [
    "https://twitter.com/usesaltio",
    "https://linkedin.com/company/usesaltio",
    "https://github.com/usesaltio",
  ],
};

export const SALT_SOFTWARE_APPLICATION = {
  name: "Salt",
  description:
    "AI-powered proposal system that turns discovery calls into signed agreements. Win premium projects with competitive intelligence and deliver through a professional client portal.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  offers: {
    price: 49,
    priceCurrency: "USD",
  },
};

export interface OrganizationDataConfig {
  name: string;
  legalName?: string;
  description?: string;
  url?: string;
  logo?: string;
  foundingDate?: string;
  founders?: Array<{ name: string; url?: string }>;
  contactEmail?: string;
  sameAs?: string[];
}

export interface SoftwareApplicationConfig {
  name?: string;
  description?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: {
    price?: number;
    priceCurrency?: string;
    priceValidUntil?: string;
  };
}

/**
 * Get structured data config, merging Sanity site settings with defaults
 */
export function getStructuredDataConfig(siteSettings?: {
  organization?: OrganizationDataConfig;
  softwareApplication?: SoftwareApplicationConfig;
}): {
  organization: OrganizationDataConfig;
  softwareApplication: SoftwareApplicationConfig;
} {
  return {
    organization: siteSettings?.organization || SALT_ORGANIZATION,
    softwareApplication:
      siteSettings?.softwareApplication || SALT_SOFTWARE_APPLICATION,
  };
}
