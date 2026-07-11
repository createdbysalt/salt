/**
 * Field name normalization utilities.
 * Pattern from research: lowercase, remove separators, strip common suffixes.
 */

const SEPARATOR_PATTERN = /[-_\s.]+/g;
const TRAILING_ID_PATTERN = /id$/i;
const TRAILING_NAME_PATTERN = /name$/i;

const COMMON_PREFIXES = ["customer_", "client_", "user_", "account_", "contact_"];
const COMMON_SUFFIXES = ["_id", "_name", "_value", "_text", "_str"];

export function normalizeFieldName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(SEPARATOR_PATTERN, "")
    .replace(TRAILING_ID_PATTERN, "");

  return normalized;
}

export function normalizeFieldNameAggressive(name: string): string {
  let normalized = normalizeFieldName(name);

  for (const prefix of COMMON_PREFIXES) {
    const cleanPrefix = prefix.replace(/_/g, "");
    if (normalized.startsWith(cleanPrefix) && normalized.length > cleanPrefix.length) {
      normalized = normalized.slice(cleanPrefix.length);
      break;
    }
  }

  for (const suffix of COMMON_SUFFIXES) {
    const cleanSuffix = suffix.replace(/_/g, "");
    if (normalized.endsWith(cleanSuffix) && normalized.length > cleanSuffix.length) {
      normalized = normalized.slice(0, -cleanSuffix.length);
      break;
    }
  }

  return normalized || normalizeFieldName(name);
}

export function tokenizeFieldName(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[-_\s.]+/)
    .filter((token) => token.length > 0);
}

export function getFieldTokenOverlap(field1: string, field2: string): number {
  const tokens1 = new Set(tokenizeFieldName(field1));
  const tokens2 = new Set(tokenizeFieldName(field2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let overlap = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) overlap++;
  }

  return overlap / Math.max(tokens1.size, tokens2.size);
}

export function extractFieldParts(fieldPath: string): {
  path: string[];
  fieldName: string;
} {
  const parts = fieldPath.split(/[.\[\]]+/).filter(Boolean);
  const fieldName = parts[parts.length - 1] || fieldPath;
  return { path: parts.slice(0, -1), fieldName };
}
