import { CompareHubPage } from "@/app/_features/marketing/compare/CompareHubPage";
import { getCompareHubEntries } from "@/app/_features/marketing/compare/get-compare-hub-entries";
import { getCompareArticleHref } from "@/app/_features/marketing/compare/compare-pages";
import { getLandingPage } from "@/app/_lib/sanity/queries";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export async function generateMetadata() {
  const compareHubPage = await getLandingPage("compare");

  return getSEOTags({
    title:
      compareHubPage?.seo?.title ??
      `Compare Salt vs Competitors | ${config.appName}`,
    description:
      compareHubPage?.seo?.description ??
      "See how Salt compares to Lindy, Viktor, ChatGPT, hiring a VA, and other approaches. Honest side-by-side guides for independent professionals.",
    canonicalUrlRelative: "/compare",
  });
}

function CompareStructuredData({
  entries,
}: {
  entries: Awaited<ReturnType<typeof getCompareHubEntries>>;
}) {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Salt comparison guides",
    description:
      "Side-by-side comparisons and guides for Salt vs other AI tools and business approaches.",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.kind === "versus" ? `Salt vs ${entry.label}` : entry.label,
      url: `https://usesalt.io${getCompareArticleHref(entry.slug)}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
    />
  );
}

export default async function ComparePage() {
  const [entries, compareHubPage] = await Promise.all([
    getCompareHubEntries(),
    getLandingPage("compare"),
  ]);
  const hubContent = compareHubPage?.hubContent;

  return (
    <>
      <CompareStructuredData entries={entries} />
      <CompareHubPage
        entries={entries}
        eyebrow={hubContent?.eyebrow}
        headline={hubContent?.headline}
        subheadline={hubContent?.subheadline}
      />
    </>
  );
}
