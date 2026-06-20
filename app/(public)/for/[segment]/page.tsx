import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaitlistFunnelTracker } from "@/app/_features/marketing/components/WaitlistFunnelTracker";
import { Landing2MarketingPage } from "@/app/_features/marketing/landing2/Landing2MarketingPage";
import { SegmentLandingStructuredData } from "@/app/_features/marketing/landing2/SegmentLandingStructuredData";
import {
  SEGMENT_LANDING_SLUGS,
  isSegmentLandingSlug,
  segmentLandingPath,
  type SegmentLandingSlug,
} from "@/app/_features/marketing/landing2/segment-landings";
import { getLandingPage } from "@/app/_lib/sanity/queries";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://usesalt.io";

type SegmentPageProps = {
  params: Promise<{ segment: string }>;
};

export function generateStaticParams() {
  return SEGMENT_LANDING_SLUGS.map((segment) => ({ segment }));
}

export async function generateMetadata({
  params,
}: SegmentPageProps): Promise<Metadata> {
  const { segment } = await params;

  if (!isSegmentLandingSlug(segment)) {
    return {};
  }

  const landing = await getLandingPage(segment);
  const canonical = `${baseUrl}${segmentLandingPath(segment)}`;
  const title =
    landing?.seo?.title ?? `Salt | AI assistant for ${segment.replace(/-/g, " ")}`;
  const description =
    landing?.seo?.description ??
    "Salt is proactive AI for independent professionals. Join the waitlist.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Salt",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical,
    },
  };
}

export default async function SegmentLandingPage({ params }: SegmentPageProps) {
  const { segment } = await params;

  if (!isSegmentLandingSlug(segment)) {
    notFound();
  }

  const landing = await getLandingPage(segment);

  if (!landing || landing.pageVariant !== "segment-landing") {
    notFound();
  }

  const title =
    landing.seo?.title ??
    `Salt | AI assistant for ${segment.replace(/-/g, " ")}`;
  const description =
    landing.seo?.description ??
    "Salt is proactive AI for independent professionals. Join the waitlist.";

  return (
    <>
      <SegmentLandingStructuredData
        slug={segment as SegmentLandingSlug}
        title={title}
        description={description}
        faqs={landing.homepageContent?.structuredDataFaqs}
      />
      <WaitlistFunnelTracker />
      <Landing2MarketingPage landingSlug={segment} />
    </>
  );
}
