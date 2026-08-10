import type { ConnectorRuleEntityType } from "@/app/_features/capture/adapters/types";
import { parseRuleInput } from "@/app/_features/capture/adapters/parse-rule-input";
import type { CustomizeArea } from "@/app/_features/capture/adapters/rule-entities";

/**
 * Tell Salt box submission planner (Sources → Customize, Phase S2).
 *
 * One box per area accepts both values ("spammy-agency.com") and sentences
 * ("keep out anything from spammy-agency.com"). The plan:
 *
 *   value parses deterministically → confirm the rule (direction toggle:
 *   keep out / always let in — a bare value carries no intent, so the
 *   confirm gate shows exactly what will be written)
 *   value doesn't parse but reads like a sentence → LLM compile
 *   otherwise → hint, never a guess
 *
 * Pure module: no server-only imports, safe for client components.
 */

export type TellSaltSubmission =
  | {
      kind: "confirm-rule";
      entityType: ConnectorRuleEntityType;
      entityKey: string;
      preview: string;
    }
  | { kind: "compile" }
  | { kind: "hint"; hint: string };

export function planTellSaltSubmission(
  raw: string,
  area: CustomizeArea | null,
): TellSaltSubmission {
  const parsed = parseRuleInput(raw, area);
  if (parsed.ok) {
    return {
      kind: "confirm-rule",
      entityType: parsed.entityType,
      entityKey: parsed.entityKey,
      preview: parsed.preview,
    };
  }

  const value = raw.trim();
  // Sentence-shaped input goes to the compiler; fragments stay hints.
  if (/\s/.test(value)) {
    return { kind: "compile" };
  }
  return { kind: "hint", hint: parsed.hint };
}
