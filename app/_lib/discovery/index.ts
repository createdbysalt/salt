/**
 * Discovery Module
 *
 * Auto-discovery services for gathering company data from URLs.
 *
 * Usage:
 *   import { runDiscovery } from '@/app/_lib/discovery'
 */

export {
  runDiscovery,
  runDiscoveryWithTimeout,
  type DiscoveryConfig,
  type DiscoveryResult,
  type SourceResult,
} from "./orchestrator";

export { scrapeWebsite } from "./scraper";
