/**
 * Tag Normalization
 *
 * Converts tag labels to stable slugs using:
 * - Lowercase
 * - Kebab-case
 * - Singularization (removes trailing 's' where appropriate)
 * - Special character removal
 *
 * This ensures "Startup", "startups", "start-up", "Start Up" all become "startup"
 */

const IRREGULAR_PLURALS: Record<string, string> = {
  people: "person",
  children: "child",
  men: "man",
  women: "woman",
  teeth: "tooth",
  feet: "foot",
  mice: "mouse",
  geese: "goose",
  agencies: "agency",
  companies: "company",
  categories: "category",
  opportunities: "opportunity",
  strategies: "strategy",
  activities: "activity",
  entities: "entity",
  properties: "property",
  queries: "query",
  replies: "reply",
  currencies: "currency",
  emergencies: "emergency",
  industries: "industry",
};

const UNCOUNTABLE = new Set([
  "software",
  "hardware",
  "information",
  "equipment",
  "news",
  "advice",
  "feedback",
  "progress",
  "research",
  "analytics",
  "logistics",
  "physics",
  "mathematics",
  "economics",
  "statistics",
  "series",
  "species",
  "sheep",
  "fish",
  "deer",
  "aircraft",
  "headquarters",
  "means",
  "offspring",
  "data",
  "media",
]);

function singularize(word: string): string {
  const lower = word.toLowerCase();

  if (UNCOUNTABLE.has(lower)) {
    return lower;
  }

  if (IRREGULAR_PLURALS[lower]) {
    return IRREGULAR_PLURALS[lower];
  }

  if (lower.endsWith("ies") && lower.length > 4) {
    return lower.slice(0, -3) + "y";
  }

  if (lower.endsWith("ves")) {
    return lower.slice(0, -3) + "f";
  }

  if (lower.endsWith("oes") && lower.length > 4) {
    return lower.slice(0, -2);
  }

  if (lower.endsWith("xes") || lower.endsWith("ches") || lower.endsWith("shes") || lower.endsWith("sses")) {
    return lower.slice(0, -2);
  }

  if (lower.endsWith("s") && lower.length > 2 && !lower.endsWith("ss")) {
    return lower.slice(0, -1);
  }

  return lower;
}

export function normalizeTagSlug(label: string): string {
  let slug = label
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const words = slug.split("-").filter(Boolean);
  if (words.length === 0) return "";

  const lastWord = words[words.length - 1];
  words[words.length - 1] = singularize(lastWord);

  return words.join("-");
}

export function normalizeTagLabel(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function isValidTagSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z]$/.test(slug);
}

export function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type TagSource = "manual" | "care" | "system";

/**
 * Rows written before the Keeper retirement carry source "keeper". Normalize
 * on read so the rest of the app only ever sees the current vocabulary.
 */
export function normalizeTagSource(source: string): TagSource {
  return source === "keeper" ? "care" : (source as TagSource);
}
