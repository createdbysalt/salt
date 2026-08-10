/**
 * Memory → Customize — Track B hard exclusions (Phase M4).
 *
 * An entry that reads as a hard exclusion with a parseable target ("never
 * let in anything from @spammy-agency.com") compiles to a workspace-scope
 * deny rule (`connector_rules`, provider NULL) — the same mechanism the
 * Sources surface writes — so the instruction is enforced deterministically
 * at intake, not merely suggested to a model.
 *
 * Entries that express a generalization ("never treat my accountant as a
 * client") have no parseable target and stay prompt-only guidance (Track
 * A). The same detector runs at write time (to create the rule) and at
 * render time (to badge the line honestly), so the badge can never claim
 * enforcement the mechanism doesn't provide.
 *
 * Pure module: no server-only imports.
 */

import { parseRuleInput } from "@/app/_features/capture/adapters/parse-rule-input";
import type { ConnectorRuleEntityType } from "@/app/_features/capture/adapters/types";

export interface HardExclusion {
  entityType: ConnectorRuleEntityType;
  entityKey: string;
  preview: string;
}

const EXCLUSION_LEAD =
  /^\s*(?:never|don'?t|do not|stop|block|keep out|always keep out)\b[\s,:-]*/i;

// Filler between the exclusion intent and the target: "let in anything
// from …", "watching mail from …", "accept emails from …".
const FILLER_VERB =
  /^(?:let(?:ting)?|watch(?:ing)?|allow(?:ing)?|accept(?:ing)?|keep(?:ing)?|receive|receiving|get(?:ting)?)\b[\s,]*/i;
const FILLER_IN = /^in\b[\s,]*/i;
const FILLER_NOUN =
  /^(?:anything|any mail|any emails?|mail|emails?|messages?|files?|events?|invites?)\b[\s,]*/i;
const FILLER_PREP = /^(?:from|named|titled|called|with|containing|like)\b[\s,]*/i;

function stripFiller(value: string): string {
  let rest = value;
  // Peel filler layers in any order, a few passes is enough for natural
  // phrasings ("let in anything from", "watching mail from", …).
  for (let i = 0; i < 4; i++) {
    const before = rest;
    rest = rest
      .replace(FILLER_VERB, "")
      .replace(FILLER_IN, "")
      .replace(FILLER_NOUN, "")
      .replace(FILLER_PREP, "")
      .trim();
    if (rest === before) break;
  }
  return rest;
}

/**
 * Detect a hard-exclusion entry with a concretely parseable target.
 * Returns null for generalizations and plain statements — those are
 * Track A guidance, not enforceable rules.
 */
export function detectHardExclusion(body: string): HardExclusion | null {
  const lead = EXCLUSION_LEAD.exec(body);
  if (!lead) return null;

  const target = stripFiller(body.slice(lead[0].length));
  if (!target) return null;

  // Workspace vocabulary (area null) — the deny rule is workspace-scope.
  const parsed = parseRuleInput(target, null);
  if (!parsed.ok) return null;

  return {
    entityType: parsed.entityType,
    entityKey: parsed.entityKey,
    preview: parsed.preview,
  };
}
