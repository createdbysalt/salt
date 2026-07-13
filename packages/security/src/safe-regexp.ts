/**
 * Glob pattern matching for user-provided sender blocklist patterns.
 *
 * Avoids dynamic RegExp construction (CodeQL js/regex-injection) while still
 * supporting simple wildcard block rules.
 */

const MAX_PATTERN_LENGTH = 256;

/** Glob syntax only — no raw regex metacharacters. */
const ALLOWED_GLOB_CHARS = /^[\w\s.@*?-]+$/;

export function isValidSenderGlobPattern(pattern: string): boolean {
  const trimmed = pattern.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_PATTERN_LENGTH &&
    ALLOWED_GLOB_CHARS.test(trimmed)
  );
}

/**
 * Match a sender name against a user glob pattern (* = any substring, ? = one char).
 */
export function matchesSenderGlobPattern(
  pattern: string,
  value: string,
): boolean {
  if (!isValidSenderGlobPattern(pattern)) return false;
  return globMatch(pattern.trim(), value);
}

function globMatch(pattern: string, haystack: string): boolean {
  const normalizedPattern = pattern.toLowerCase();
  const normalizedHaystack = haystack.toLowerCase();

  let patternIndex = 0;
  let haystackIndex = 0;
  let starPatternIndex = -1;
  let starHaystackIndex = -1;

  while (haystackIndex < normalizedHaystack.length) {
    const patternChar = normalizedPattern[patternIndex];
    const haystackChar = normalizedHaystack[haystackIndex];

    if (patternChar === "?") {
      patternIndex += 1;
      haystackIndex += 1;
      continue;
    }

    if (patternChar === "*") {
      starPatternIndex = patternIndex;
      starHaystackIndex = haystackIndex;
      patternIndex += 1;
      if (patternIndex === normalizedPattern.length) return true;
      continue;
    }

    if (patternChar === haystackChar) {
      patternIndex += 1;
      haystackIndex += 1;
      continue;
    }

    if (starPatternIndex === -1) return false;

    patternIndex = starPatternIndex + 1;
    starHaystackIndex += 1;
    haystackIndex = starHaystackIndex;
  }

  while (patternIndex < normalizedPattern.length && normalizedPattern[patternIndex] === "*") {
    patternIndex += 1;
  }

  return patternIndex === normalizedPattern.length;
}
