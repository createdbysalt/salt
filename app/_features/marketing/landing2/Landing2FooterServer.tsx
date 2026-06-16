import { fetchResolvedSiteSettings } from "@/app/_features/marketing/site-settings-fetch";
import { Landing2Footer } from "./Landing2Footer";

export async function Landing2FooterServer() {
  const settings = await fetchResolvedSiteSettings();
  return <Landing2Footer settings={settings} />;
}
