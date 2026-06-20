import { cache } from "react";
import type { LegalDocumentSlug } from "./load-legal-document";
import { loadLegalDocument } from "./load-legal-document";
import { prepareLegalMarkdown } from "./prepare-legal-markdown";
import { getLegalPage } from "@/app/_lib/sanity/queries";
import type { LegalPage, PortableTextBlock } from "@/app/_lib/sanity/types";

export type ResolvedLegalPage = {
  title: string;
  lastUpdated: string | null;
  appliesTo: string | null;
  source: "sanity" | "markdown";
  portableTextBody?: PortableTextBlock[];
  markdownBody?: string;
  seo?: LegalPage["seo"];
};

type LegalRouteConfig = {
  sanitySlug: string;
  markdownSlug: LegalDocumentSlug;
  fallbackTitle: string;
};

export const LEGAL_ROUTE_CONFIG: Record<string, LegalRouteConfig> = {
  "privacy-policy": {
    sanitySlug: "privacy-policy",
    markdownSlug: "privacy-policy",
    fallbackTitle: "Privacy Policy",
  },
  "terms-of-use": {
    sanitySlug: "terms-of-use",
    markdownSlug: "website-terms-of-use",
    fallbackTitle: "Website Terms of Use",
  },
  "cookie-policy": {
    sanitySlug: "cookie-policy",
    markdownSlug: "cookie-policy",
    fallbackTitle: "Cookie Policy",
  },
  "early-access": {
    sanitySlug: "early-access",
    markdownSlug: "early-access-terms",
    fallbackTitle: "Early Access Terms",
  },
  tos: {
    sanitySlug: "tos",
    markdownSlug: "service-terms",
    fallbackTitle: "Service Terms",
  },
};

function formatSanityDate(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export const resolveLegalPage = cache(
  async (routeSlug: string): Promise<ResolvedLegalPage | null> => {
    const config = LEGAL_ROUTE_CONFIG[routeSlug];
    if (!config) return null;

    try {
      const doc = await getLegalPage(config.sanitySlug);
      if (doc?.body?.length) {
        return {
          title: doc.title,
          lastUpdated: formatSanityDate(doc.lastUpdated),
          appliesTo: null,
          source: "sanity",
          portableTextBody: doc.body,
          seo: doc.seo,
        };
      }
    } catch {
      // fall through to markdown
    }

    const markdown = loadLegalDocument(config.markdownSlug);
    const prepared = prepareLegalMarkdown(markdown, config.fallbackTitle);

    return {
      title: prepared.title,
      lastUpdated: prepared.lastUpdated,
      appliesTo: prepared.appliesTo,
      source: "markdown",
      markdownBody: prepared.body,
    };
  }
);
