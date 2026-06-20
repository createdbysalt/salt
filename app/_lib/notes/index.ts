/**
 * Notes Library
 *
 * Utilities for Salt's Obsidian-style notes with wikilinks.
 *
 * Usage:
 *   import { extractWikilinks, resolveWikilinks } from '@/app/_lib/notes'
 */

export {
  extractWikilinks,
  resolveWikilinks,
  getLinkedEntityIds,
  renderWikilinksToHtml,
  hasWikilinks,
  countWikilinks,
  nameToSlug,
  type WikilinkMatch,
  type ResolvedEntity,
  type ResolvedWikilink,
} from "./wikilink-parser";
