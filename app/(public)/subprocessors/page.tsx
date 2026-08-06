import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "subprocessors",
    canonicalUrlRelative: "/subprocessors",
    defaultTitle: legalDefaultTitle("Subprocessors"),
    defaultDescription:
      "List of third-party service providers that process data on behalf of Salt.",
  });
}

export default function SubprocessorsPage() {
  return <UnifiedLegalPage routeSlug="subprocessors" />;
}
