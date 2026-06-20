import {
  generateLegalRouteMetadata,
  LegalRoutePage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/LegalRoutePage";

export async function generateMetadata() {
  return generateLegalRouteMetadata({
    routeSlug: "early-access",
    canonicalUrlRelative: "/early-access",
    defaultTitle: legalDefaultTitle("Early Access Terms"),
    defaultDescription:
      "Terms for Salt waitlist members and invited early-access users before general availability.",
  });
}

export default function EarlyAccessPage() {
  return (
    <LegalRoutePage
      routeSlug="early-access"
      canonicalUrlRelative="/early-access"
      defaultTitle={legalDefaultTitle("Early Access Terms")}
      defaultDescription=""
    />
  );
}
