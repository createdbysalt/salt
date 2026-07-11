/**
 * Jaro-Winkler similarity algorithm.
 * Preferred over Levenshtein for short strings like field names.
 * Gives bonus weight to matching prefixes.
 */

export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3
  );
}

function commonPrefixLength(s1: string, s2: string, maxLen: number): number {
  let len = 0;
  while (len < maxLen && len < s1.length && len < s2.length && s1[len] === s2[len]) {
    len++;
  }
  return len;
}

export function jaroWinkler(s1: string, s2: string, prefixScale = 0.1): number {
  const jaro = jaroSimilarity(s1, s2);
  const prefixLen = commonPrefixLength(s1, s2, 4);
  return jaro + prefixLen * prefixScale * (1 - jaro);
}

export function jaroWinklerSorted(
  source: string,
  targets: string[],
  threshold = 0.8
): Array<{ target: string; score: number }> {
  const results: Array<{ target: string; score: number }> = [];

  for (const target of targets) {
    const score = jaroWinkler(source, target);
    if (score >= threshold) {
      results.push({ target, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
