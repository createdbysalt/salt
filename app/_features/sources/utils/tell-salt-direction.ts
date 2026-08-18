/**
 * Tell Salt direction detection (Sources → Customize).
 *
 * A bare value ("spammy-agency.com") carries no intent, but people often
 * say it: "keep out spammy-agency.com", "always let in invoices@stripe.com".
 * This pulls a leading direction phrase off the raw input so the box can
 * preset the keep-out / let-in choice and parse the remainder as the rule
 * target. Longest phrases win ("never let in" before "let in").
 *
 * Deliberately absent: "watch" — watching is a gate outcome, not a rule,
 * so the word never maps to allow/deny here.
 *
 * Pure module: no server-only imports, safe for client components.
 */

export type RuleDirection = "allow" | "deny";

export interface DirectionDetection {
  direction: RuleDirection;
  /** The input with the direction phrase removed — what gets parsed. */
  rest: string;
  /** The phrase as the user typed it (for echoing back, if needed). */
  phrase: string;
}

const DENY_PHRASES = [
  "never let in",
  "don't let in",
  "do not let in",
  "keep out",
  "keep-out",
  "block",
  "drop",
  "skip",
] as const;

const ALLOW_PHRASES = [
  "always let in",
  "always show",
  "don't miss",
  "do not miss",
  "never miss",
  "let in",
  "allow",
] as const;

function matchPhrase(
  input: string,
  phrases: readonly string[],
): { phrase: string; rest: string } | null {
  const lowered = input.toLowerCase();
  for (const phrase of phrases) {
    if (!lowered.startsWith(phrase)) continue;
    const after = input.slice(phrase.length);
    // The phrase must be a complete word and followed by a target.
    if (after.length === 0 || !/^\s/.test(after)) continue;
    const rest = after.trim();
    if (rest.length === 0) continue;
    return { phrase: input.slice(0, phrase.length), rest };
  }
  return null;
}

/** Pull a leading direction phrase off raw Tell Salt input, if present. */
export function extractDirection(raw: string): DirectionDetection | null {
  const input = raw.trim();
  if (input.length === 0) return null;
  const deny = matchPhrase(input, DENY_PHRASES);
  if (deny) return { direction: "deny", ...deny };
  const allow = matchPhrase(input, ALLOW_PHRASES);
  if (allow) return { direction: "allow", ...allow };
  return null;
}
