import { getLandingCapabilityCards } from "@/app/_lib/sanity/queries";
import { Landing2Container } from "./Landing2Container";
import { Landing2SectionHeader } from "./Landing2SectionHeader";
import { Landing2CapabilitiesGrid } from "./Landing2CapabilitiesGrid";
import { LANDING_CAPABILITY_FALLBACK } from "./landing-capability-fallback";
import { HOMEPAGE_CONTENT_FALLBACK } from "./homepage-content-fallback";
import {
  applyVariantToCapabilityCards,
  DEFAULT_LANDING_VARIANT,
  type LandingVariant,
} from "./landing-variants";

type Landing2CapabilitiesSectionProps = {
  eyebrow?: string;
  title?: string;
  landingSlug?: string;
  variant?: LandingVariant;
};

export async function Landing2CapabilitiesSection({
  eyebrow = HOMEPAGE_CONTENT_FALLBACK.productEyebrow ?? "Features",
  title =
    HOMEPAGE_CONTENT_FALLBACK.productTitle ??
    "Salt runs the work. You run the business.",
  landingSlug = "home",
  variant = DEFAULT_LANDING_VARIANT,
}: Landing2CapabilitiesSectionProps) {
  const cards = await getLandingCapabilityCards(landingSlug);
  const visibleCards = applyVariantToCapabilityCards(
    cards.length > 0 ? cards : LANDING_CAPABILITY_FALLBACK,
    variant
  );

  return (
    <section id="product" className="scroll-mt-20 py-20 lg:py-28">
      <Landing2Container>
        <Landing2SectionHeader eyebrow={eyebrow} title={title} />
        <Landing2CapabilitiesGrid cards={visibleCards} />
      </Landing2Container>
    </section>
  );
}
