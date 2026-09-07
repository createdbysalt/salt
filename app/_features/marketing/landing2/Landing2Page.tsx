import { Landing2MarketingPage } from "./Landing2MarketingPage";
import { DEFAULT_LANDING_VARIANT, type LandingVariant } from "./landing-variants";
import "./landing2.css";

export async function Landing2Page({
  variant = DEFAULT_LANDING_VARIANT,
}: {
  variant?: LandingVariant;
} = {}) {
  return <Landing2MarketingPage landingSlug="home" variant={variant} />;
}
