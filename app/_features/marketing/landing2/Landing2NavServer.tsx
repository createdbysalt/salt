import { fetchResolvedSiteSettings } from "@/app/_features/marketing/site-settings-fetch";
import { Landing2Nav } from "./Landing2Nav";

export async function Landing2NavServer() {
  const settings = await fetchResolvedSiteSettings();
  return <Landing2Nav cta={settings.ctaButton} />;
}
