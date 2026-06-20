import {
  generateLegalRouteMetadata,
  LegalRoutePage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/LegalRoutePage";

export async function generateMetadata() {
  return generateLegalRouteMetadata({
    routeSlug: "terms-of-use",
    canonicalUrlRelative: "/terms-of-use",
    defaultTitle: legalDefaultTitle("Website Terms of Use"),
    defaultDescription:
      "Terms governing your use of usesalt.io, including the marketing site and waitlist.",
  });
}

export default function TermsOfUsePage() {
  return (
    <LegalRoutePage
      routeSlug="terms-of-use"
      canonicalUrlRelative="/terms-of-use"
      defaultTitle={legalDefaultTitle("Website Terms of Use")}
      defaultDescription=""
    />
  );
}
