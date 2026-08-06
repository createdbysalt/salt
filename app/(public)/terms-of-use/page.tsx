import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "terms-of-use",
    canonicalUrlRelative: "/terms-of-use",
    defaultTitle: legalDefaultTitle("Terms of Use"),
    defaultDescription:
      "Terms and conditions governing your use of the Salt website by Simcoe House Inc.",
  });
}

export default function TermsOfUsePage() {
  return <UnifiedLegalPage routeSlug="terms-of-use" />;
}
