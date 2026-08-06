import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "dpa",
    canonicalUrlRelative: "/dpa",
    defaultTitle: legalDefaultTitle("Data Processing Agreement"),
    defaultDescription:
      "Data Processing Agreement for Salt customers in the EEA, UK, and Switzerland.",
  });
}

export default function DpaPage() {
  return <UnifiedLegalPage routeSlug="dpa" />;
}
