export type ScriptWord = {
  text: string;
  weight: number;
};

/** Tokenize script for proportional karaoke-style highlighting. */
export function tokenizeScript(script: string): ScriptWord[] {
  return script
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({
      text,
      weight: Math.max(1, text.replace(/[^\w]/g, "").length || text.length),
    }));
}

/** Active word index from playback progress (0–1), weighted by word length. */
export function getActiveWordIndex(words: ScriptWord[], progress: number): number {
  if (words.length === 0) return -1;

  const clamped = Math.min(1, Math.max(0, progress));
  const totalWeight = words.reduce((sum, word) => sum + word.weight, 0);
  if (totalWeight <= 0) return 0;

  const target = clamped * totalWeight;
  let accumulated = 0;

  for (let index = 0; index < words.length; index += 1) {
    accumulated += words[index].weight;
    if (accumulated >= target) {
      return index;
    }
  }

  return words.length - 1;
}
