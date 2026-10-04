import type { Metadata } from "next";
import { headers } from "next/headers";
import { HomePageStructuredData } from "@/app/_features/marketing/components/HomePageStructuredData";
import { WaitlistFunnelTracker } from "@/app/_features/marketing/components/WaitlistFunnelTracker";
import { Landing2Page } from "@/app/_features/marketing/landing2/Landing2Page";
import { LandingHomeVariantTracker } from "@/app/_features/marketing/landing2/LandingHomeVariantTracker";
import {
  LP_VARIANT_HEADER,
  resolveLandingVariant,
} from "@/app/_features/marketing/landing2/landing-variants";
import { getHomePage } from "@/app/_lib/sanity/queries";

// Reads the per-visitor A/B variant header set by middleware — render per request.
export const dynamic = "force-dynamic";

const DEFAULT_TITLE = "Salt | Proactive AI for Your Business — Join the Waitlist";
const DEFAULT_DESCRIPTION =
  "Salt is proactive AI for independent professionals — an AI ops assistant that shows you what matters, prepares your moves, and waits for your approval. Join the waitlist.";

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomePage();
  const title = home?.seo?.title ?? DEFAULT_TITLE;
  const description = home?.seo?.description ?? DEFAULT_DESCRIPTION;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://usesalt.io",
      siteName: "Salt",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: "https://usesalt.io",
    },
  };
}

export default async function HomePage() {
  const headerList = await headers();
  const variant = resolveLandingVariant(headerList.get(LP_VARIANT_HEADER));

  return (
    <>
      <HomePageStructuredData />
      <WaitlistFunnelTracker />
      <LandingHomeVariantTracker variant={variant} />
      <Landing2Page variant={variant} />
    </>
  );
}
