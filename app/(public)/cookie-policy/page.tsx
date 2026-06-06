import { LegalDocumentPage } from "@/app/_features/marketing/components/LegalDocumentPage";
import { CookiePolicyPreferencesAction } from "@/app/_features/marketing/components/CookiePolicyPreferencesAction";
import { loadLegalDocument } from "@/app/_lib/legal/load-legal-document";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Cookie Policy | ${config.appName}`,
  description:
    "How Salt uses cookies and similar technologies, and how to manage your preferences.",
  canonicalUrlRelative: "/cookie-policy",
});

export default function CookiePolicyPage() {
  const markdown = loadLegalDocument("cookie-policy");

  return (
    <LegalDocumentPage
      title="Cookie Policy"
      markdown={markdown}
      afterHeader={<CookiePolicyPreferencesAction />}
    />
  );
}
