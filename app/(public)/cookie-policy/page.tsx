import { CookiePolicyPreferencesAction } from "@/app/_features/marketing/components/CookiePolicyPreferencesAction";
import {
  generateLegalRouteMetadata,
  LegalRoutePage,
  legalDefaultTitle,
} from "@/app/_features/marketing/components/LegalRoutePage";

export async function generateMetadata() {
  return generateLegalRouteMetadata({
    routeSlug: "cookie-policy",
    canonicalUrlRelative: "/cookie-policy",
    defaultTitle: legalDefaultTitle("Cookie Policy"),
    defaultDescription:
      "How Salt uses cookies and similar technologies, and how to manage your preferences.",
  });
}

export default function CookiePolicyPage() {
  return (
    <LegalRoutePage
      routeSlug="cookie-policy"
      canonicalUrlRelative="/cookie-policy"
      defaultTitle={legalDefaultTitle("Cookie Policy")}
      defaultDescription=""
      afterHeader={<CookiePolicyPreferencesAction />}
    />
  );
}
