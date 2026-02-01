/**
 * Discovery Orchestrator
 *
 * Coordinates auto-discovery from multiple sources to gather company data.
 * Uses Promise.allSettled to gracefully handle failures from individual sources.
 *
 * Sources (in order of priority):
 * 1. Website scraper (extracts data directly from the URL)
 * 2. Future: Clearbit API (company enrichment)
 * 3. Future: BuiltWith API (tech stack detection)
 *
 * Usage:
 *   import { runDiscovery } from '@/app/_lib/discovery/orchestrator'
 *   const result = await runDiscovery('https://example.com')
 */

import type { DiscoveryData, ScrapedData } from "@/app/_features/intake/types";

// =============================================================================
// TYPES
// =============================================================================

/** Result from an individual discovery source */
export interface SourceResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  duration_ms: number;
}

/** Configuration for the discovery process */
export interface DiscoveryConfig {
  /** Maximum time to wait for all sources (ms) */
  timeout_ms?: number;
  /** Whether to skip the scraper */
  skip_scraper?: boolean;
  /** Whether to skip Clearbit enrichment */
  skip_clearbit?: boolean;
  /** Whether to skip BuiltWith detection */
  skip_builtwith?: boolean;
}

/** Result of the complete discovery process */
export interface DiscoveryResult {
  success: boolean;
  data: DiscoveryData;
  sources: {
    scraper: SourceResult<ScrapedData>;
    clearbit: SourceResult<ClearbitData> | null;
    builtwith: SourceResult<BuiltWithData> | null;
  };
  total_duration_ms: number;
  completed_sources: number;
  failed_sources: number;
}

/** Clearbit enrichment data (placeholder for future implementation) */
interface ClearbitData {
  company_name?: string;
  industry?: string;
  employees?: number;
  funding?: string;
  logo_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
}

/** BuiltWith tech detection data (placeholder for future implementation) */
interface BuiltWithData {
  technologies?: string[];
  analytics?: string[];
  cms?: string;
  framework?: string;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: Required<DiscoveryConfig> = {
  timeout_ms: 30000, // 30 seconds total
  skip_scraper: false,
  skip_clearbit: true, // Not implemented yet
  skip_builtwith: true, // Not implemented yet
};

// =============================================================================
// PLACEHOLDER SOURCE FUNCTIONS
// =============================================================================

/**
 * Placeholder for website scraper
 * Will be implemented in S2-005
 */
async function runScraper(url: string): Promise<SourceResult<ScrapedData>> {
  const start = Date.now();
  try {
    // Import scraper dynamically to avoid circular dependencies
    // and allow it to be implemented separately
    const { scrapeWebsite } = await import("./scraper");
    const data = await scrapeWebsite(url);

    return {
      success: data !== null,
      data,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Scraper failed",
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * Placeholder for Clearbit enrichment
 * Not implemented - returns null
 */
async function runClearbit(
  _domain: string
): Promise<SourceResult<ClearbitData>> {
  const start = Date.now();
  // Clearbit not implemented yet
  return {
    success: false,
    data: null,
    error: "Clearbit enrichment not implemented",
    duration_ms: Date.now() - start,
  };
}

/**
 * Placeholder for BuiltWith detection
 * Not implemented - returns null
 */
async function runBuiltWith(
  _url: string
): Promise<SourceResult<BuiltWithData>> {
  const start = Date.now();
  // BuiltWith not implemented yet
  return {
    success: false,
    data: null,
    error: "BuiltWith detection not implemented",
    duration_ms: Date.now() - start,
  };
}

// =============================================================================
// MERGE LOGIC
// =============================================================================

/**
 * Merges results from all sources into a single DiscoveryData object.
 * Prioritizes data from more reliable sources (Clearbit > Scraper).
 */
function mergeResults(
  scraperResult: SourceResult<ScrapedData>,
  clearbitResult: SourceResult<ClearbitData> | null,
  builtwithResult: SourceResult<BuiltWithData> | null
): DiscoveryData {
  const data: DiscoveryData = {};

  // Start with scraped data as the base
  if (scraperResult.success && scraperResult.data) {
    const scraped = scraperResult.data;

    data.scraped_data = scraped;

    // Extract company name from title
    if (scraped.title) {
      data.company_name = extractCompanyName(scraped.title);
    }

    // Visual identity from scraper
    data.visual_identity = {
      primary_colors: scraped.primary_colors,
      favicon_url: scraped.favicon_url,
    };

    // Social links from scraper
    if (scraped.social_links && scraped.social_links.length > 0) {
      data.social_links = scraped.social_links;
    }
  }

  // Overlay Clearbit data (higher priority for company info)
  if (clearbitResult?.success && clearbitResult.data) {
    const clearbit = clearbitResult.data;

    // Clearbit company name is more authoritative
    if (clearbit.company_name) {
      data.company_name = clearbit.company_name;
    }

    if (clearbit.industry) {
      data.industry = clearbit.industry;
    }

    if (clearbit.employees) {
      data.team_size_estimate = clearbit.employees;
    }

    if (clearbit.funding) {
      data.funding_status = clearbit.funding;
    }

    // Merge social links from Clearbit
    if (clearbit.linkedin_url || clearbit.twitter_url) {
      const socialLinks = data.social_links || [];

      if (
        clearbit.linkedin_url &&
        !socialLinks.some((s) => s.platform === "linkedin")
      ) {
        socialLinks.push({ platform: "linkedin", url: clearbit.linkedin_url });
      }

      if (
        clearbit.twitter_url &&
        !socialLinks.some((s) => s.platform === "twitter")
      ) {
        socialLinks.push({ platform: "twitter", url: clearbit.twitter_url });
      }

      if (socialLinks.length > 0) {
        data.social_links = socialLinks;
      }
    }

    // Store raw Clearbit data
    data.clearbit_data = clearbit as unknown as Record<string, unknown>;
  }

  // Overlay BuiltWith data
  if (builtwithResult?.success && builtwithResult.data) {
    const builtwith = builtwithResult.data;

    if (builtwith.technologies && builtwith.technologies.length > 0) {
      data.tech_stack = builtwith.technologies;
    }

    // Store raw BuiltWith data
    data.builtwith_data = builtwith as unknown as Record<string, unknown>;
  }

  return data;
}

/**
 * Extracts a clean company name from a page title.
 * Removes common suffixes like "| Home", "- Welcome", etc.
 */
function extractCompanyName(title: string): string {
  // Common separators used in page titles
  const separators = [" | ", " - ", " – ", " — ", " :: ", " : "];

  let cleanTitle = title.trim();

  // Find the first separator and take the first part
  for (const sep of separators) {
    const index = cleanTitle.indexOf(sep);
    if (index > 0) {
      cleanTitle = cleanTitle.substring(0, index).trim();
      break;
    }
  }

  // Remove common suffixes
  const suffixes = [
    "Home",
    "Welcome",
    "Official Site",
    "Official Website",
    "Main Page",
  ];
  for (const suffix of suffixes) {
    if (cleanTitle.toLowerCase().endsWith(suffix.toLowerCase())) {
      cleanTitle = cleanTitle.slice(0, -suffix.length).trim();
      // Remove trailing separators
      cleanTitle = cleanTitle.replace(/[-|–—:]+$/, "").trim();
    }
  }

  return cleanTitle || title;
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Runs the complete discovery process for a given URL.
 *
 * @param url - The website URL to discover data from
 * @param config - Optional configuration overrides
 * @returns DiscoveryResult with aggregated data and source details
 *
 * @example
 * ```ts
 * const result = await runDiscovery('https://example.com');
 * if (result.success) {
 *   console.log(result.data.company_name);
 * }
 * ```
 */
export async function runDiscovery(
  url: string,
  config: DiscoveryConfig = {}
): Promise<DiscoveryResult> {
  const start = Date.now();
  const opts = { ...DEFAULT_CONFIG, ...config };

  // Extract domain for enrichment services
  let domain: string;
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, "");
  } catch {
    // If URL parsing fails, try to extract domain anyway
    domain = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }

  // Run sources in parallel
  const [scraperResult, clearbitResult, builtwithResult] =
    await Promise.allSettled([
      !opts.skip_scraper
        ? runScraper(url)
        : Promise.resolve<SourceResult<ScrapedData>>({
            success: false,
            data: null,
            error: "Scraper skipped",
            duration_ms: 0,
          }),
      !opts.skip_clearbit
        ? runClearbit(domain)
        : Promise.resolve<SourceResult<ClearbitData>>({
            success: false,
            data: null,
            error: "Clearbit skipped",
            duration_ms: 0,
          }),
      !opts.skip_builtwith
        ? runBuiltWith(url)
        : Promise.resolve<SourceResult<BuiltWithData>>({
            success: false,
            data: null,
            error: "BuiltWith skipped",
            duration_ms: 0,
          }),
    ]);

  // Unwrap settled results
  const scraperFinal: SourceResult<ScrapedData> =
    scraperResult.status === "fulfilled"
      ? scraperResult.value
      : {
          success: false,
          data: null,
          error:
            scraperResult.reason instanceof Error
              ? scraperResult.reason.message
              : "Scraper rejected",
          duration_ms: Date.now() - start,
        };

  const clearbitFinal: SourceResult<ClearbitData> | null =
    clearbitResult.status === "fulfilled" ? clearbitResult.value : null;

  const builtwithFinal: SourceResult<BuiltWithData> | null =
    builtwithResult.status === "fulfilled" ? builtwithResult.value : null;

  // Count successes and failures
  const sources = [scraperFinal, clearbitFinal, builtwithFinal].filter(
    (s) => s !== null
  );
  const completed = sources.filter((s) => s?.success).length;
  const failed = sources.length - completed;

  // Merge results
  const mergedData = mergeResults(scraperFinal, clearbitFinal, builtwithFinal);

  return {
    success: completed > 0, // Success if at least one source returned data
    data: mergedData,
    sources: {
      scraper: scraperFinal,
      clearbit: clearbitFinal,
      builtwith: builtwithFinal,
    },
    total_duration_ms: Date.now() - start,
    completed_sources: completed,
    failed_sources: failed,
  };
}

/**
 * Runs discovery for a URL with a timeout wrapper.
 * Useful when you need to ensure discovery doesn't block too long.
 */
export async function runDiscoveryWithTimeout(
  url: string,
  timeout_ms: number = 30000,
  config: DiscoveryConfig = {}
): Promise<DiscoveryResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const result = await runDiscovery(url, config);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    // Return a failed result with timeout error
    return {
      success: false,
      data: {},
      sources: {
        scraper: {
          success: false,
          data: null,
          error: "Timeout",
          duration_ms: timeout_ms,
        },
        clearbit: null,
        builtwith: null,
      },
      total_duration_ms: timeout_ms,
      completed_sources: 0,
      failed_sources: 1,
    };
  }
}
