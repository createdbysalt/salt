/**
 * Tag Deduplication
 *
 * Fuzzy matching to prevent near-duplicate tags.
 * Uses Levenshtein distance + alias checking before creating new tags.
 */

export interface ExistingTag {
  id: string;
  slug: string;
  label: string;
  isArchived: boolean;
}

export interface DedupeResult {
  action: "reuse" | "create" | "unarchive";
  existingTag?: ExistingTag;
  reason?: string;
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

const COMMON_ALIASES: Record<string, string[]> = {
  vip: ["important", "high-value", "priority"],
  startup: ["early-stage", "seed-stage"],
  enterprise: ["large-company", "corporate", "big-company"],
  agency: ["firm", "studio"],
  solopreneur: ["solo", "freelancer", "independent"],
  "at-risk": ["risky", "risk", "concerning"],
  "high-priority": ["urgent", "important", "critical"],
  "low-touch": ["low-maintenance", "self-serve"],
};

function isAliasOf(slug: string, existingSlug: string): boolean {
  const aliases = COMMON_ALIASES[existingSlug];
  if (aliases && aliases.includes(slug)) {
    return true;
  }
  for (const [canonical, aliasList] of Object.entries(COMMON_ALIASES)) {
    if (canonical === existingSlug && aliasList.includes(slug)) {
      return true;
    }
    if (canonical === slug && aliasList.includes(existingSlug)) {
      return true;
    }
  }
  return false;
}

const SIMILARITY_THRESHOLD = 0.85;

export function checkForDuplicate(
  newSlug: string,
  existingTags: ExistingTag[]
): DedupeResult {
  const exactMatch = existingTags.find((t) => t.slug === newSlug);
  if (exactMatch) {
    if (exactMatch.isArchived) {
      return {
        action: "unarchive",
        existingTag: exactMatch,
        reason: `Exact match found (archived): "${exactMatch.label}"`,
      };
    }
    return {
      action: "reuse",
      existingTag: exactMatch,
      reason: `Exact match: "${exactMatch.label}"`,
    };
  }

  for (const tag of existingTags) {
    if (isAliasOf(newSlug, tag.slug)) {
      if (tag.isArchived) {
        return {
          action: "unarchive",
          existingTag: tag,
          reason: `Alias of archived tag: "${tag.label}"`,
        };
      }
      return {
        action: "reuse",
        existingTag: tag,
        reason: `Alias of existing tag: "${tag.label}"`,
      };
    }
  }

  let bestMatch: ExistingTag | null = null;
  let bestScore = 0;

  for (const tag of existingTags) {
    const score = similarityScore(newSlug, tag.slug);
    if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
      bestScore = score;
      bestMatch = tag;
    }
  }

  if (bestMatch) {
    if (bestMatch.isArchived) {
      return {
        action: "unarchive",
        existingTag: bestMatch,
        reason: `Similar to archived tag "${bestMatch.label}" (${Math.round(bestScore * 100)}% match)`,
      };
    }
    return {
      action: "reuse",
      existingTag: bestMatch,
      reason: `Similar to "${bestMatch.label}" (${Math.round(bestScore * 100)}% match)`,
    };
  }

  return { action: "create" };
}

export function findMergeCandidates(
  tags: ExistingTag[]
): Array<{ tagA: ExistingTag; tagB: ExistingTag; score: number }> {
  const candidates: Array<{ tagA: ExistingTag; tagB: ExistingTag; score: number }> = [];

  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const score = similarityScore(tags[i].slug, tags[j].slug);
      if (score >= 0.7 && score < 1) {
        candidates.push({ tagA: tags[i], tagB: tags[j], score });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}
