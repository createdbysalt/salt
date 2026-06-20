import config from "@/config";

const BASE_URL = `https://${config.domainName}`;

/** Normalize Sanity CDN or site-relative paths for OG / JSON-LD. */
export function toAbsoluteBlogImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${BASE_URL}${path}`;
}
