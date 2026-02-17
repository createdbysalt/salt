/**
 * Discovery Module
 *
 * Auto-discovery services for gathering company data from URLs.
 *
 * Usage:
 *   import { runDiscovery } from '@/app/_lib/discovery'
 *   import { transformToDiscoveryData } from '@/app/_lib/discovery'
 */

export {
  runDiscovery,
  runDiscoveryWithTimeout,
  type DiscoveryConfig,
  type DiscoveryResult,
  type SourceResult,
} from "./orchestrator";

export { scrapeWebsite } from "./scraper";

// Firecrawl MCP adapter
export {
  parseFirecrawlMarkdown,
  transformToScrapedData,
  transformToDiscoveryData,
  analyzeContentStructure,
  type FirecrawlScrapeResult,
  type FirecrawlCrawlResult,
  type FirecrawlMapResult,
  type FirecrawlSearchResult,
  type ExtractedContent,
  type ContentStructure,
} from "./firecrawl-adapter";
