import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "privacy-policy",
    canonicalUrlRelative: "/privacy-policy",
    defaultTitle: legalDefaultTitle("Privacy Policy"),
    defaultDescription:
      "How Simcoe House Inc. collects, uses, and protects your information across Salt.",
  });
}

export default function PrivacyPolicyPage() {
  return <UnifiedLegalPage routeSlug="privacy-policy" />;
}
