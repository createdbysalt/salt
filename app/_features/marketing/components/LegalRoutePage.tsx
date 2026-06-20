import { LegalDocumentPage } from "@/app/_features/marketing/components/LegalDocumentPage";
import { resolveLegalPage } from "@/app/_lib/legal/resolve-legal-page";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type LegalRoutePageProps = {
  routeSlug: string;
  canonicalUrlRelative: string;
  defaultTitle: string;
  defaultDescription: string;
  afterHeader?: ReactNode;
};

export async function generateLegalRouteMetadata({
  routeSlug,
  canonicalUrlRelative,
  defaultTitle,
  defaultDescription,
}: Pick<
  LegalRoutePageProps,
  "routeSlug" | "canonicalUrlRelative" | "defaultTitle" | "defaultDescription"
>) {
  const page = await resolveLegalPage(routeSlug);

  return getSEOTags({
    title: page?.seo?.title ?? defaultTitle,
    description: page?.seo?.description ?? defaultDescription,
    canonicalUrlRelative,
  });
}

export async function LegalRoutePage({
  routeSlug,
  afterHeader,
}: LegalRoutePageProps) {
  const page = await resolveLegalPage(routeSlug);

  if (!page) {
    notFound();
  }

  return <LegalDocumentPage page={page} afterHeader={afterHeader} />;
}

export function legalDefaultTitle(label: string) {
  return `${label} | ${config.appName}`;
}
