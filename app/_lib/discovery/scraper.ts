/**
 * Website Scraper
 *
 * Extracts basic data from a website including title, description,
 * favicon, colors, and social links.
 *
 * Features:
 * - 5 second timeout for all fetches
 * - Graceful error handling (returns null on failure)
 * - Server-side only (runs in server actions)
 *
 * Usage:
 *   import { scrapeWebsite } from '@/app/_lib/discovery/scraper'
 *   const data = await scrapeWebsite('https://example.com')
 */

import type { ScrapedData } from "@/app/_features/intake/types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum time to wait for a fetch (ms) */
const FETCH_TIMEOUT_MS = 5000;

/** User agent to use for requests */
const USER_AGENT =
  "Mozilla/5.0 (compatible; SaltBot/1.0; +https://getsalt.dev)";

/** Social media platform patterns */
const SOCIAL_PATTERNS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: "twitter", pattern: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi },
  { platform: "linkedin", pattern: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/gi },
  { platform: "instagram", pattern: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/gi },
  { platform: "facebook", pattern: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+/gi },
  { platform: "youtube", pattern: /https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)[a-zA-Z0-9_-]+/gi },
  { platform: "github", pattern: /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/gi },
  { platform: "tiktok", pattern: /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+/gi },
];

/** Common hex color pattern */
const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;

// =============================================================================
// FETCH HELPERS
// =============================================================================

/**
 * Fetch a URL with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeout: number = FETCH_TIMEOUT_MS
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);
    return response;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// =============================================================================
// EXTRACTION HELPERS
// =============================================================================

/**
 * Extract content from a meta tag
 */
function extractMetaContent(html: string, nameOrProperty: string): string | undefined {
  // Try name attribute
  const nameMatch = html.match(
    new RegExp(
      `<meta[^>]+name=["']${escapeRegex(nameOrProperty)}["'][^>]+content=["']([^"']+)["']`,
      "i"
    )
  );
  if (nameMatch) return decodeHtmlEntities(nameMatch[1]);

  // Try property attribute (for og: tags)
  const propertyMatch = html.match(
    new RegExp(
      `<meta[^>]+property=["']${escapeRegex(nameOrProperty)}["'][^>]+content=["']([^"']+)["']`,
      "i"
    )
  );
  if (propertyMatch) return decodeHtmlEntities(propertyMatch[1]);

  // Try reverse order (content before name/property)
  const reverseNameMatch = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegex(nameOrProperty)}["']`,
      "i"
    )
  );
  if (reverseNameMatch) return decodeHtmlEntities(reverseNameMatch[1]);

  const reversePropertyMatch = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegex(nameOrProperty)}["']`,
      "i"
    )
  );
  if (reversePropertyMatch) return decodeHtmlEntities(reversePropertyMatch[1]);

  return undefined;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string | undefined {
  // First try og:title
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle) return ogTitle;

  // Then try title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return decodeHtmlEntities(titleMatch[1].trim());

  return undefined;
}

/**
 * Extract description from HTML
 */
function extractDescription(html: string): string | undefined {
  // First try og:description
  const ogDesc = extractMetaContent(html, "og:description");
  if (ogDesc) return ogDesc;

  // Then try meta description
  const metaDesc = extractMetaContent(html, "description");
  if (metaDesc) return metaDesc;

  return undefined;
}

/**
 * Extract favicon URL from HTML
 */
function extractFavicon(html: string, baseUrl: string): string | undefined {
  // Try various link tags for favicon
  const patterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return resolveUrl(match[1], baseUrl);
    }
  }

  // Default to /favicon.ico
  try {
    const url = new URL(baseUrl);
    return `${url.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

/**
 * Extract og:image URL
 */
function extractOgImage(html: string, baseUrl: string): string | undefined {
  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) {
    return resolveUrl(ogImage, baseUrl);
  }
  return undefined;
}

/**
 * Extract social links from HTML
 */
function extractSocialLinks(html: string): Array<{ platform: string; url: string }> {
  const links: Array<{ platform: string; url: string }> = [];
  const seen = new Set<string>();

  for (const { platform, pattern } of SOCIAL_PATTERNS) {
    const matches = html.match(pattern) || [];
    for (const match of matches) {
      // Normalize URL (remove trailing slashes, query params)
      const normalizedUrl = match.split("?")[0].replace(/\/+$/, "");
      const key = `${platform}:${normalizedUrl.toLowerCase()}`;

      // Skip if already seen
      if (seen.has(key)) continue;
      seen.add(key);

      // Skip common false positives
      if (isGenericSocialUrl(normalizedUrl, platform)) continue;

      links.push({ platform, url: normalizedUrl });
    }
  }

  return links;
}

/**
 * Check if a social URL is likely generic (like share buttons)
 */
function isGenericSocialUrl(url: string, platform: string): boolean {
  const lowered = url.toLowerCase();

  // Common share/intent URLs
  if (lowered.includes("/intent/") || lowered.includes("/share")) return true;
  if (lowered.includes("/sharer")) return true;

  // Generic profiles
  if (platform === "twitter" && (lowered.endsWith("/twitter") || lowered.endsWith("/x"))) return true;
  if (platform === "linkedin" && lowered.endsWith("/linkedin")) return true;
  if (platform === "instagram" && lowered.endsWith("/instagram")) return true;
  if (platform === "facebook" && lowered.endsWith("/facebook")) return true;

  return false;
}

/**
 * Extract meta keywords
 */
function extractKeywords(html: string): string[] | undefined {
  const keywords = extractMetaContent(html, "keywords");
  if (!keywords) return undefined;

  return keywords
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 10); // Limit to 10 keywords
}

/**
 * Extract primary colors from HTML (from CSS or style tags)
 */
function extractColors(html: string): string[] | undefined {
  const colors = new Set<string>();

  // Look for colors in style tags and inline styles
  const styleMatches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const inlineMatches = html.match(/style=["'][^"']+["']/gi) || [];
  const cssVarMatches = html.match(/--[a-zA-Z-]+:\s*#[0-9a-fA-F]{3,6}/gi) || [];

  const allStyles = [...styleMatches, ...inlineMatches, ...cssVarMatches].join(" ");

  // Extract hex colors
  const hexMatches = allStyles.match(HEX_COLOR_PATTERN) || [];
  for (const color of hexMatches) {
    // Normalize to lowercase
    const normalized = color.toLowerCase();

    // Skip common non-brand colors (white, black, gray)
    if (isGenericColor(normalized)) continue;

    colors.add(normalized);
  }

  // Also check for theme-color meta tag
  const themeColor = extractMetaContent(html, "theme-color");
  if (themeColor && themeColor.match(HEX_COLOR_PATTERN)) {
    const normalized = themeColor.toLowerCase();
    if (!isGenericColor(normalized)) {
      colors.add(normalized);
    }
  }

  if (colors.size === 0) return undefined;

  // Return up to 5 colors
  return Array.from(colors).slice(0, 5);
}

/**
 * Check if a color is generic (white, black, gray)
 */
function isGenericColor(hex: string): boolean {
  const generic = [
    "#fff",
    "#ffffff",
    "#000",
    "#000000",
    "#333",
    "#333333",
    "#666",
    "#666666",
    "#999",
    "#999999",
    "#ccc",
    "#cccccc",
    "#ddd",
    "#dddddd",
    "#eee",
    "#eeeeee",
    "#f5f5f5",
    "#fafafa",
    "#111",
    "#111111",
    "#222",
    "#222222",
    "#444",
    "#444444",
    "#555",
    "#555555",
    "#777",
    "#777777",
    "#888",
    "#888888",
    "#aaa",
    "#aaaaaa",
    "#bbb",
    "#bbbbbb",
  ];
  return generic.includes(hex.toLowerCase());
}

/**
 * Extract contact email from HTML
 */
function extractContactEmail(html: string): string | undefined {
  // Look for mailto: links
  const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (mailtoMatch) return mailtoMatch[1];

  // Look for email patterns in text (be conservative)
  // Only match if it looks like a contact email
  const contactPatterns = [
    /contact@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    /info@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    /hello@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    /support@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    /sales@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
  ];

  for (const pattern of contactPatterns) {
    const match = html.match(pattern);
    if (match) return match[0].toLowerCase();
  }

  return undefined;
}

/**
 * Extract contact phone from HTML
 */
function extractContactPhone(html: string): string | undefined {
  // Look for tel: links
  const telMatch = html.match(/tel:([+\d\s()-]+)/i);
  if (telMatch) {
    return telMatch[1].replace(/\s+/g, "").trim();
  }

  // Look for phone numbers with common formats (US focused)
  const phonePatterns = [
    /\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,
  ];

  for (const pattern of phonePatterns) {
    const match = html.match(pattern);
    if (match) return match[0].trim();
  }

  return undefined;
}

// =============================================================================
// UTILITY HELPERS
// =============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(str: string): string {
  // Replace &amp; last to avoid double-unescaping (e.g., &amp;lt; -> &lt; -> <)
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Resolve a potentially relative URL to an absolute URL
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

// =============================================================================
// MAIN SCRAPER FUNCTION
// =============================================================================

/**
 * Scrapes a website and extracts key data.
 *
 * @param url - The website URL to scrape
 * @returns ScrapedData object or null on failure
 *
 * @example
 * ```ts
 * const data = await scrapeWebsite('https://example.com');
 * if (data) {
 *   console.log(data.title, data.description);
 * }
 * ```
 */
export async function scrapeWebsite(url: string): Promise<ScrapedData | null> {
  try {
    // Ensure URL has protocol
    let normalizedUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      normalizedUrl = `https://${url}`;
    }

    // Fetch the page
    const response = await fetchWithTimeout(normalizedUrl, FETCH_TIMEOUT_MS);

    if (!response || !response.ok) {
      return null;
    }

    // Get HTML content
    const html = await response.text();

    // Extract data
    const data: ScrapedData = {};

    // Basic metadata
    const title = extractTitle(html);
    if (title) data.title = title;

    const description = extractDescription(html);
    if (description) data.description = description;

    const favicon = extractFavicon(html, normalizedUrl);
    if (favicon) data.favicon_url = favicon;

    const ogImage = extractOgImage(html, normalizedUrl);
    if (ogImage) data.og_image = ogImage;

    // Keywords
    const keywords = extractKeywords(html);
    if (keywords && keywords.length > 0) data.meta_keywords = keywords;

    // Visual identity - colors
    const colors = extractColors(html);
    if (colors && colors.length > 0) data.primary_colors = colors;

    // Social links
    const socialLinks = extractSocialLinks(html);
    if (socialLinks.length > 0) data.social_links = socialLinks;

    // Contact info
    const email = extractContactEmail(html);
    if (email) data.contact_email = email;

    const phone = extractContactPhone(html);
    if (phone) data.contact_phone = phone;

    return data;
  } catch {
    // Graceful failure - return null
    return null;
  }
}
