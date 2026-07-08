/**
 * Routing eval runner: tests whether natural language sentences route to the
 * correct playbook (or correctly to none). Uses deterministic keyword matching
 * for CI compatibility — no LLM calls.
 *
 * The scoring algorithm extracts keywords from both the input and each playbook's
 * `when_to_use` field, then scores overlap. A playbook must exceed a minimum
 * threshold to be considered a match.
 */

import {
  discoverPlaybookDirs,
  readPlaybookSource,
} from "../discover-playbooks";
import { parsePlaybookMarkdown } from "../parse-playbook";

export interface RoutingEvalCase {
  id: string;
  input: string;
  expected: string | null;
  reason?: string;
}

export interface RoutingEvalFile {
  description?: string;
  evals: RoutingEvalCase[];
}

export interface RoutingEvalResult {
  eval_id: string;
  input: string;
  expected: string | null;
  actual: string | null;
  score: number;
  passed: boolean;
  evidence: string;
}

export interface RoutingBenchmarkResult {
  passed: number;
  total: number;
  results: RoutingEvalResult[];
}

interface PlaybookRoutingInfo {
  slug: string;
  name: string;
  whenToUse: string;
  keywords: Set<string>;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
  "because", "until", "while", "about", "against", "this", "that",
  "these", "those", "am", "it", "its", "i", "me", "my", "you", "your",
  "he", "she", "they", "them", "we", "us", "what", "which", "who",
]);

const MIN_MATCH_THRESHOLD = 0.15;

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.has(w));

  return new Set(words);
}

function scoreMatch(inputKeywords: Set<string>, playbookKeywords: Set<string>): number {
  if (inputKeywords.size === 0 || playbookKeywords.size === 0) return 0;

  let matches = 0;
  for (const word of inputKeywords) {
    if (playbookKeywords.has(word)) {
      matches++;
    }
    for (const pkw of playbookKeywords) {
      if (pkw.includes(word) || word.includes(pkw)) {
        matches += 0.5;
      }
    }
  }

  const maxPossible = Math.min(inputKeywords.size, playbookKeywords.size);
  return maxPossible > 0 ? matches / maxPossible : 0;
}

export function loadRoutablePlaybooks(): PlaybookRoutingInfo[] {
  const discovered = discoverPlaybookDirs();
  const playbooks: PlaybookRoutingInfo[] = [];

  for (const item of discovered) {
    try {
      const source = readPlaybookSource(item.playbookPath);
      const parsed = parsePlaybookMarkdown(source, item.playbookPath);

      if (parsed.frontmatter.kind !== "acting") continue;

      const whenToUse = parsed.frontmatter.when_to_use ?? "";
      if (!whenToUse.trim()) continue;

      playbooks.push({
        slug: parsed.frontmatter.slug,
        name: parsed.frontmatter.name,
        whenToUse,
        keywords: extractKeywords(whenToUse),
      });
    } catch {
      continue;
    }
  }

  return playbooks;
}

export function routeInput(
  input: string,
  playbooks: PlaybookRoutingInfo[],
): { slug: string | null; score: number } {
  if (playbooks.length === 0) {
    return { slug: null, score: 0 };
  }

  const inputKeywords = extractKeywords(input);
  let bestMatch: { slug: string; score: number } | null = null;

  for (const playbook of playbooks) {
    const score = scoreMatch(inputKeywords, playbook.keywords);

    if (score >= MIN_MATCH_THRESHOLD) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { slug: playbook.slug, score };
      }
    }
  }

  return bestMatch ?? { slug: null, score: 0 };
}

export function runRoutingEval(
  evalCase: RoutingEvalCase,
  playbooks: PlaybookRoutingInfo[],
): RoutingEvalResult {
  const { slug: actual, score } = routeInput(evalCase.input, playbooks);

  const passed = actual === evalCase.expected;

  let evidence: string;
  if (passed) {
    if (actual === null) {
      evidence = "Correctly matched no playbook";
    } else {
      evidence = `Correctly matched "${actual}" (score: ${score.toFixed(2)})`;
    }
  } else {
    if (evalCase.expected === null) {
      evidence = `Expected no match, got "${actual}" (score: ${score.toFixed(2)})`;
    } else if (actual === null) {
      evidence = `Expected "${evalCase.expected}", got no match`;
    } else {
      evidence = `Expected "${evalCase.expected}", got "${actual}" (score: ${score.toFixed(2)})`;
    }
  }

  return {
    eval_id: evalCase.id,
    input: evalCase.input,
    expected: evalCase.expected,
    actual,
    score,
    passed,
    evidence,
  };
}

export function runRoutingBenchmark(evals: RoutingEvalCase[]): RoutingBenchmarkResult {
  const playbooks = loadRoutablePlaybooks();
  const results = evals.map((evalCase) => runRoutingEval(evalCase, playbooks));
  const passed = results.filter((r) => r.passed).length;

  return {
    passed,
    total: results.length,
    results,
  };
}
