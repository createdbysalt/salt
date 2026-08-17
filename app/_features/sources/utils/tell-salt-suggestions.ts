import { parseRuleInput } from "@/app/_features/capture/adapters/parse-rule-input";
import type { CustomizeArea } from "@/app/_features/capture/adapters/rule-entities";

/**
 * "Try:" suggestion chips for the Tell Salt box (Sources → Customize).
 *
 * Every suggestion is deterministic on purpose — values and prefixes that
 * parse without the LLM compile route, so a chip click is instant and
 * free. A bare value carries no direction, so each click lands on the
 * confirm gate's Keep out / Always let in toggle — the chips teach the
 * intent vocabulary by walking the user through it once.
 *
 * Pure module: no server-only imports, safe for client components.
 */
export const RULE_SUGGESTIONS: Record<
  CustomizeArea | "workspace",
  readonly string[]
> = {
  workspace: ["*newsletter*", "subject:invoice", "@spammy-agency.com"],
  email: ["*newsletter*", "subject:receipt", "@spammy-agency.com"],
  calendar: ["*lunch*", "*standup*", "attendee:sarah@acme.com"],
  billing: ["billing@stripe.com"],
  storage: ["*template*", "*draft*"],
  messaging: ["#random", "*unsubscribe*"],
  meetings: ["*standup*", "participant:sarah@acme.com"],
  crm: ["sarah@acme.com"],
  projects: ["sarah@acme.com"],
};

/**
 * Suggestions for the box, minus any whose parsed key already lives in the
 * rules list. Parsing doubles as validation — a suggestion that no longer
 * parses against the area's vocabulary silently drops out instead of
 * erroring in the UI (the co-located test catches that drift).
 */
export function suggestionsForArea(
  area: CustomizeArea | null,
  existingKeys: readonly string[],
): string[] {
  const taken = new Set(existingKeys.map((key) => key.toLowerCase()));
  return RULE_SUGGESTIONS[area ?? "workspace"].filter((suggestion) => {
    const parsed = parseRuleInput(suggestion, area);
    return parsed.ok && !taken.has(parsed.entityKey.toLowerCase());
  });
}
