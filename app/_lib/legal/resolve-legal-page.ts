import { cache } from "react";
import type { LegalDocumentSlug } from "./load-legal-document";
import { loadLegalDocument } from "./load-legal-document";
import { prepareLegalMarkdown } from "./prepare-legal-markdown";
import { getLegalPage } from "@/app/_lib/sanity/queries";
import type {
  LegalPage,
  LegalPageManagementType,
  PortableTextBlock,
} from "@/app/_lib/sanity/types";

export type ResolvedLegalPage = {
  title: string;
  lastUpdated: string | null;
  appliesTo: string | null;
  /** How this page is managed */
  managementType: LegalPageManagementType;
  /** Termageddon policy ID (only for termageddon-managed pages) */
  termageddonPolicyId?: string;
  /** Source of content (sanity or markdown fallback) */
  contentSource: "sanity" | "markdown";
  portableTextBody?: PortableTextBlock[];
  markdownBody?: string;
  seo?: LegalPage["seo"];
};

type LegalRouteConfig = {
  sanitySlug: string;
  markdownSlug: LegalDocumentSlug;
  fallbackTitle: string;
  /** Fallback management type if not set in Sanity */
  fallbackManagementType?: LegalPageManagementType;
  /** Fallback Termageddon policy ID (used during migration) */
  fallbackTermageddonPolicyId?: string;
};

/**
 * Known Termageddon policy IDs (for migration/fallback)
 * These are used when Sanity doesn't have the management type set yet.
 */
const TERMAGEDDON_POLICY_IDS = {
  "privacy-policy": "Y0RadVYzZERVRlZsWm1GdGFYYzlQUT09",
  "terms-of-use": "YUdKS1NYSklkbGRrYnpWUFExRTlQUT09",
  disclaimer: "ZDJsTU0zTXpUbGQ0YjJwWlluYzlQUT09",
} as const;

export const LEGAL_ROUTE_CONFIG: Record<string, LegalRouteConfig> = {
  "privacy-policy": {
    sanitySlug: "privacy-policy",
    markdownSlug: "privacy-policy",
    fallbackTitle: "Privacy Policy",
    fallbackManagementType: "termageddon",
    fallbackTermageddonPolicyId: TERMAGEDDON_POLICY_IDS["privacy-policy"],
  },
  "terms-of-use": {
    sanitySlug: "terms-of-use",
    markdownSlug: "website-terms-of-use",
    fallbackTitle: "Website Terms of Use",
    fallbackManagementType: "termageddon",
    fallbackTermageddonPolicyId: TERMAGEDDON_POLICY_IDS["terms-of-use"],
  },
  disclaimer: {
    sanitySlug: "disclaimer",
    markdownSlug: "disclaimer",
    fallbackTitle: "Disclaimer",
    fallbackManagementType: "termageddon",
    fallbackTermageddonPolicyId: TERMAGEDDON_POLICY_IDS["disclaimer"],
  },
  "cookie-policy": {
    sanitySlug: "cookie-policy",
    markdownSlug: "cookie-policy",
    fallbackTitle: "Cookie Policy",
    fallbackManagementType: "self-managed",
  },
  "early-access": {
    sanitySlug: "early-access",
    markdownSlug: "early-access-terms",
    fallbackTitle: "Early Access Terms",
    fallbackManagementType: "self-managed",
  },
  // Note: /tos redirects to /terms-of-use (see app/(public)/tos/page.tsx)
  // The Termageddon Terms of Service covers both website and application usage.
  subprocessors: {
    sanitySlug: "subprocessors",
    markdownSlug: "subprocessors",
    fallbackTitle: "Subprocessors",
    fallbackManagementType: "self-managed",
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

    // Try Sanity first
    try {
      const doc = await getLegalPage(config.sanitySlug);
      if (doc) {
        // Determine management type from Sanity or fallback
        const managementType =
          doc.managementType ?? config.fallbackManagementType ?? "self-managed";
        const termageddonPolicyId =
          doc.termageddonPolicyId ?? config.fallbackTermageddonPolicyId;

        // For Termageddon pages, we don't need body content
        if (managementType === "termageddon" && termageddonPolicyId) {
          return {
            title: doc.title,
            lastUpdated: formatSanityDate(doc.lastUpdated),
            appliesTo: null,
            managementType: "termageddon",
            termageddonPolicyId,
            contentSource: "sanity",
            seo: doc.seo,
          };
        }

        // For self-managed pages with body content
        if (doc.body?.length) {
          return {
            title: doc.title,
            lastUpdated: formatSanityDate(doc.lastUpdated),
            appliesTo: null,
            managementType: "self-managed",
            contentSource: "sanity",
            portableTextBody: doc.body,
            seo: doc.seo,
          };
        }
      }
    } catch {
      // fall through to markdown/fallback
    }

    // Check if this should be a Termageddon page by fallback config
    if (
      config.fallbackManagementType === "termageddon" &&
      config.fallbackTermageddonPolicyId
    ) {
      return {
        title: config.fallbackTitle,
        lastUpdated: null,
        appliesTo: null,
        managementType: "termageddon",
        termageddonPolicyId: config.fallbackTermageddonPolicyId,
        contentSource: "markdown", // technically a fallback, but we're using Termageddon
      };
    }

    // Fall back to markdown for self-managed pages
    const markdown = loadLegalDocument(config.markdownSlug);
    const prepared = prepareLegalMarkdown(markdown, config.fallbackTitle);

    return {
      title: prepared.title,
      lastUpdated: prepared.lastUpdated,
      appliesTo: prepared.appliesTo,
      managementType: "self-managed",
      contentSource: "markdown",
      markdownBody: prepared.body,
    };
  }
);
