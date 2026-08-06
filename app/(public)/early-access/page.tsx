import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "early-access",
    canonicalUrlRelative: "/early-access",
    defaultTitle: legalDefaultTitle("Early Access Terms"),
    defaultDescription:
      "Terms for Salt waitlist members and invited early-access users before general availability.",
  });
}

export default function EarlyAccessPage() {
  return <UnifiedLegalPage routeSlug="early-access" />;
}
