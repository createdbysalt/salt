import { getSEOTags } from "@/app/_lib/seo";
import { TermageddonPage } from "@/app/_features/marketing/components/TermageddonPage";
import config from "@/config";

const TERMAGEDDON_DISCLAIMER_ID = "ZDJsTU0zTXpUbGQ0YjJwWlluYzlQUT09";

export async function generateMetadata() {
  return getSEOTags({
    title: `Disclaimer | ${config.appName}`,
    description:
      "Important disclaimers regarding the use of Salt by Simcoe House Inc.",
    canonicalUrlRelative: "/disclaimer",
  });
}

export default function DisclaimerPage() {
  return (
    <TermageddonPage
      title="Disclaimer"
      policyId={TERMAGEDDON_DISCLAIMER_ID}
    />
  );
}
