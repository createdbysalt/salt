import type { CompareArticleSlug } from "../compare-slugs";
import type { CompareNarrativeConfig } from "../types";
import { saltAlternativesNarrative } from "./salt-alternatives";
import { saltVsChatgptNarrative } from "./salt-vs-chatgpt";
import { saltVsHiringAVaNarrative } from "./salt-vs-hiring-a-va";
import { saltVsLindyNarrative } from "./salt-vs-lindy";
import { saltVsViktorNarrative } from "./salt-vs-viktor";

const COMPARE_NARRATIVES: Record<CompareArticleSlug, CompareNarrativeConfig> = {
  "salt-vs-lindy": saltVsLindyNarrative,
  "salt-vs-viktor": saltVsViktorNarrative,
  "salt-vs-chatgpt": saltVsChatgptNarrative,
  "salt-vs-hiring-a-va": saltVsHiringAVaNarrative,
  "salt-alternatives": saltAlternativesNarrative,
};

export function getCompareNarrativeForSlug(
  slug: CompareArticleSlug,
): CompareNarrativeConfig | undefined {
  return COMPARE_NARRATIVES[slug];
}
