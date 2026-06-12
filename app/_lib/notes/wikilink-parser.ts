/**
 * Wikilink Parser
 *
 * Parses Obsidian-style [[wikilinks]] from markdown content and resolves
 * them to Salt entities (people, orgs, work).
 *
 * Syntax supported:
 * - [[Entity Name]] - links to entity by name
 * - [[Entity Name|Display Text]] - links with alias
 * - [[entity-slug]] - links by slug
 */

export type WikilinkMatch = {
  raw: string;
  target: string;
  alias: string | null;
  position: { start: number; end: number };
};

export type ResolvedEntity = {
  id: string;
  type: "person" | "org" | "work" | "space" | "note";
  name: string;
  slug?: string;
};

export type ResolvedWikilink = WikilinkMatch & {
  entity: ResolvedEntity | null;
  exists: boolean;
};

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extract all wikilinks from markdown content.
 * Does not resolve them to entities - just extracts the raw links.
 */
export function extractWikilinks(content: string): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  let match: RegExpExecArray | null;

  WIKILINK_REGEX.lastIndex = 0;

  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    matches.push({
      raw: match[0],
      target: match[1].trim(),
      alias: match[2]?.trim() ?? null,
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });
  }

  return matches;
}

/**
 * Normalize a name for matching (lowercase, remove extra spaces).
 */
function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Create a slug from a name (lowercase, hyphens for spaces).
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Resolve wikilinks against a list of known entities.
 * Returns the wikilinks with matched entity information.
 */
export function resolveWikilinks(
  content: string,
  entities: ResolvedEntity[]
): ResolvedWikilink[] {
  const wikilinks = extractWikilinks(content);

  const entityMap = new Map<string, ResolvedEntity>();
  for (const entity of entities) {
    entityMap.set(normalizeForMatch(entity.name), entity);
    if (entity.slug) {
      entityMap.set(normalizeForMatch(entity.slug), entity);
    }
  }

  return wikilinks.map((link) => {
    const normalizedTarget = normalizeForMatch(link.target);
    const entity = entityMap.get(normalizedTarget) ?? null;

    return {
      ...link,
      entity,
      exists: entity !== null,
    };
  });
}

/**
 * Get unique entity IDs linked in content.
 * Useful for creating entity_relations records.
 */
export function getLinkedEntityIds(
  content: string,
  entities: ResolvedEntity[]
): Array<{ id: string; type: ResolvedEntity["type"] }> {
  const resolved = resolveWikilinks(content, entities);
  const seen = new Set<string>();
  const result: Array<{ id: string; type: ResolvedEntity["type"] }> = [];

  for (const link of resolved) {
    if (link.entity && !seen.has(link.entity.id)) {
      seen.add(link.entity.id);
      result.push({ id: link.entity.id, type: link.entity.type });
    }
  }

  return result;
}

/**
 * Replace wikilinks with rendered HTML anchors.
 * Used for displaying notes with clickable links.
 */
export function renderWikilinksToHtml(
  content: string,
  entities: ResolvedEntity[],
  options: {
    linkClassName?: string;
    newLinkClassName?: string;
    hrefTemplate?: (entity: ResolvedEntity) => string;
    newHrefTemplate?: (target: string) => string;
  } = {}
): string {
  const {
    linkClassName = "wikilink",
    newLinkClassName = "wikilink-new",
    hrefTemplate = (e) => `/${e.type}s/${e.slug ?? e.id}`,
    newHrefTemplate = (target) => `#new:${nameToSlug(target)}`,
  } = options;

  const resolved = resolveWikilinks(content, entities);

  let result = content;
  let offset = 0;

  for (const link of resolved) {
    const displayText = link.alias ?? link.target;
    const className = link.exists ? linkClassName : newLinkClassName;
    const href = link.entity
      ? hrefTemplate(link.entity)
      : newHrefTemplate(link.target);

    const anchor = `<a href="${href}" class="${className}" data-entity-type="${link.entity?.type ?? "unknown"}" data-entity-id="${link.entity?.id ?? ""}">${displayText}</a>`;

    const start = link.position.start + offset;
    const end = link.position.end + offset;

    result = result.slice(0, start) + anchor + result.slice(end);
    offset += anchor.length - link.raw.length;
  }

  return result;
}

/**
 * Check if content contains any wikilinks.
 */
export function hasWikilinks(content: string): boolean {
  WIKILINK_REGEX.lastIndex = 0;
  return WIKILINK_REGEX.test(content);
}

/**
 * Count wikilinks in content.
 */
export function countWikilinks(content: string): number {
  return extractWikilinks(content).length;
}
