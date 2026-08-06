import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { resolveLegalPage } from "@/app/_lib/legal/resolve-legal-page";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";
import { LegalDocumentPage } from "./LegalDocumentPage";
import { TermageddonPage } from "./TermageddonPage";

type UnifiedLegalPageProps = {
  routeSlug: string;
  canonicalUrlRelative: string;
  defaultTitle: string;
  defaultDescription: string;
  /** Optional content to render after the header (e.g., cookie preferences button) */
  afterHeader?: ReactNode;
};

/**
 * Generate SEO metadata for a legal page.
 * Works with both Termageddon and self-managed pages.
 */
export async function generateUnifiedLegalMetadata({
  routeSlug,
  canonicalUrlRelative,
  defaultTitle,
  defaultDescription,
}: Omit<UnifiedLegalPageProps, "afterHeader">) {
  const page = await resolveLegalPage(routeSlug);

  return getSEOTags({
    title: page?.seo?.title ?? defaultTitle,
    description: page?.seo?.description ?? defaultDescription,
    canonicalUrlRelative,
  });
}

/**
 * Unified legal page component that renders either:
 * - Termageddon embed (for termageddon-managed pages)
 * - Self-managed content from Sanity or markdown fallback
 */
export async function UnifiedLegalPage({
  routeSlug,
  afterHeader,
}: Pick<UnifiedLegalPageProps, "routeSlug" | "afterHeader">) {
  const page = await resolveLegalPage(routeSlug);

  if (!page) {
    notFound();
  }

  // Render Termageddon embed for termageddon-managed pages
  if (page.managementType === "termageddon" && page.termageddonPolicyId) {
    return (
      <TermageddonPage
        title={page.title}
        policyId={page.termageddonPolicyId}
        lastUpdated={page.lastUpdated ?? undefined}
      />
    );
  }

  // Render self-managed content
  return <LegalDocumentPage page={page} afterHeader={afterHeader} />;
}

/**
 * Helper to create a standard legal page title
 */
export function legalDefaultTitle(label: string) {
  return `${label} | ${config.appName}`;
}
