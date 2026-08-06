import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "terms-of-service",
    canonicalUrlRelative: "/terms-of-service",
    defaultTitle: legalDefaultTitle("Terms of Service"),
    defaultDescription:
      "Terms and conditions governing your use of the Salt website and application by Simcoe House Inc.",
  });
}

export default function TermsOfServicePage() {
  return <UnifiedLegalPage routeSlug="terms-of-service" />;
}
