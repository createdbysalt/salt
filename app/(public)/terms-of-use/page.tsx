import { getSEOTags } from "@/app/_lib/seo";
import { TermageddonPage } from "@/app/_features/marketing/components/TermageddonPage";
import config from "@/config";

const TERMAGEDDON_TERMS_ID = "YUdKS1NYSklkbGRrYnpWUFExRTlQUT09";

export async function generateMetadata() {
  return getSEOTags({
    title: `Terms of Service | ${config.appName}`,
    description:
      "Terms and conditions governing your use of Salt by Simcoe House Inc.",
    canonicalUrlRelative: "/terms-of-use",
  });
}

export default function TermsOfUsePage() {
  return (
    <TermageddonPage
      title="Terms of Service"
      policyId={TERMAGEDDON_TERMS_ID}
    />
  );
}
