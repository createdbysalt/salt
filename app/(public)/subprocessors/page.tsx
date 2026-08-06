import {
  generateLegalRouteMetadata,
  LegalRoutePage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/LegalRoutePage";

export async function generateMetadata() {
  return generateLegalRouteMetadata({
    routeSlug: "subprocessors",
    canonicalUrlRelative: "/subprocessors",
    defaultTitle: legalDefaultTitle("Subprocessors"),
    defaultDescription:
      "List of third-party service providers that process data on behalf of Salt.",
  });
}

export default function SubprocessorsPage() {
  return (
    <LegalRoutePage
      routeSlug="subprocessors"
      canonicalUrlRelative="/subprocessors"
      defaultTitle={legalDefaultTitle("Subprocessors")}
      defaultDescription=""
    />
  );
}
