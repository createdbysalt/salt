import { LegalDocumentPage } from "@/app/_features/marketing/components/LegalDocumentPage";
import { loadLegalDocument } from "@/app/_lib/legal/load-legal-document";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Website Terms of Use | ${config.appName}`,
  description:
    "Terms governing your use of usesalt.io, including the marketing site and waitlist.",
  canonicalUrlRelative: "/terms-of-use",
});

export default function TermsOfUsePage() {
  const markdown = loadLegalDocument("website-terms-of-use");

  return (
    <LegalDocumentPage title="Website Terms of Use" markdown={markdown} />
  );
}
