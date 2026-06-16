import { cache } from "react";
import { getSiteSettings } from "@/app/_lib/sanity/queries";
import {
  resolveSiteSettings,
  type ResolvedSiteSettings,
} from "./site-settings-config";

export const fetchResolvedSiteSettings = cache(async (): Promise<ResolvedSiteSettings> => {
  const settings = await getSiteSettings();
  return resolveSiteSettings(settings);
});
