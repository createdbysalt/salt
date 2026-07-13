export type ScriptSection = {
  text: string;
  weight: number;
};

/** Split briefing into sentence-sized sections for broad highlight regions. */
export function splitScriptSections(script: string): ScriptSection[] {
  return script
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .map((text) => ({
      text,
      weight: Math.max(1, text.length),
    }));
}

/** Active section from playback progress (0–1), weighted by section length. */
export function getActiveSectionIndex(
  sections: ScriptSection[],
  progress: number,
): number {
  if (sections.length === 0) return -1;

  const clamped = Math.min(1, Math.max(0, progress));
  const totalWeight = sections.reduce((sum, section) => sum + section.weight, 0);
  if (totalWeight <= 0) return 0;

  const target = clamped * totalWeight;
  let accumulated = 0;

  for (let index = 0; index < sections.length; index += 1) {
    accumulated += sections[index].weight;
    if (accumulated >= target) {
      return index;
    }
  }

  return sections.length - 1;
}
