import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "disclaimer",
    canonicalUrlRelative: "/disclaimer",
    defaultTitle: legalDefaultTitle("Disclaimer"),
    defaultDescription:
      "Important disclaimers regarding the use of Salt by Simcoe House Inc.",
  });
}

export default function DisclaimerPage() {
  return <UnifiedLegalPage routeSlug="disclaimer" />;
}
