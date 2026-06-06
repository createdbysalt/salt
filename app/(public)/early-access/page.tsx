import { LegalDocumentPage } from "@/app/_features/marketing/components/LegalDocumentPage";
import { loadLegalDocument } from "@/app/_lib/legal/load-legal-document";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Early Access Terms | ${config.appName}`,
  description:
    "Terms for Salt waitlist members and invited early-access users before general availability.",
  canonicalUrlRelative: "/early-access",
});

export default function EarlyAccessPage() {
  const markdown = loadLegalDocument("early-access-terms");

  return (
    <LegalDocumentPage title="Early Access Terms" markdown={markdown} />
  );
}
