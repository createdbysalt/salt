import { CookiePolicyPreferencesAction } from "@/app/_features/marketing/components/CookiePolicyPreferencesAction";
import {
  generateUnifiedLegalMetadata,
  UnifiedLegalPage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/UnifiedLegalPage";

export async function generateMetadata() {
  return generateUnifiedLegalMetadata({
    routeSlug: "cookie-policy",
    canonicalUrlRelative: "/cookie-policy",
    defaultTitle: legalDefaultTitle("Cookie Policy"),
    defaultDescription:
      "How Salt uses cookies and similar technologies, and how to manage your preferences.",
  });
}

export default function CookiePolicyPage() {
  return (
    <UnifiedLegalPage
      routeSlug="cookie-policy"
      afterHeader={<CookiePolicyPreferencesAction />}
    />
  );
}
