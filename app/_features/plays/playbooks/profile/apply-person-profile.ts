import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import {
  evaluateFieldFromRules,
  personSignalsToFacts,
} from "./evaluate-rules";
import { resolveProfileRules } from "./resolve-rules";
import type {
  ProfileFieldResult,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import {
  defaultPeopleProfileRules,
  relationshipFromLegacyHeuristics,
  resolveRuleSetValue,
} from "./validate-rules";

const PEOPLE_PROFILE_SLUG = "people-profile";

export function evaluatePersonProfileFields(input: {
  email: string;
  signals?: PersonSignals;
  extractedTitle?: string | null;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion?: number;
}): {
  relationshipType: RelationshipType;
  title: string | null;
  orgDomain: string | null;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
} {
  const resolved = resolveProfileRules({
    systemRules: input.systemRules,
    settings: input.settings,
    defaultRules: defaultPeopleProfileRules(),
  });

  const facts = personSignalsToFacts(input.email, input.signals, {
    extracted_title: input.extractedTitle,
  });

  const results: ProfileFieldResult[] = [];

  const relationshipRule = evaluateFieldFromRules({
    field: "relationship_type",
    rules: resolved.rules.rules,
    facts,
    context: resolved.context,
    autoApplyThreshold: resolved.autoApplyThreshold,
  });

  let relationshipType: RelationshipType = "unknown";

  if (relationshipRule) {
    relationshipType = relationshipRule.value as RelationshipType;
    results.push({
      field: "relationship_type",
      value: relationshipRule.value,
      confidence: relationshipRule.confidence,
      because: relationshipRule.because,
      source: relationshipRule.source,
      ruleId: relationshipRule.ruleId,
      status: relationshipRule.status,
      evidence: { email: input.email },
    });
  } else if (resolved.aiFallbackEnabled) {
    const legacy = relationshipFromLegacyHeuristics(input.signals);
    const confidence = legacy === "unknown" ? 40 : 70;
    const status = confidence >= resolved.autoApplyThreshold ? "applied" : "pending";
    relationshipType = legacy;
    results.push({
      field: "relationship_type",
      value: legacy,
      confidence,
      because: "Inferred from contact signals when no rule matched",
      source: "ai_fallback",
      ruleId: null,
      status,
      evidence: { email: input.email, signals: input.signals ?? {} },
    });
  }

  const titleRule = evaluateFieldFromRules({
    field: "title",
    rules: resolved.rules.rules,
    facts,
    context: resolved.context,
    autoApplyThreshold: resolved.autoApplyThreshold,
  });

  let title: string | null = null;
  if (titleRule) {
    title = resolveRuleSetValue(titleRule.value ?? "", facts);
    results.push({
      field: "title",
      value: title,
      confidence: titleRule.confidence,
      because: titleRule.because,
      source: titleRule.source,
      ruleId: titleRule.ruleId,
      status: title ? titleRule.status : "pending",
      evidence: { extracted_title: facts.extracted_title },
    });
  }

  const orgRule = evaluateFieldFromRules({
    field: "org_link",
    rules: resolved.rules.rules,
    facts,
    context: resolved.context,
    autoApplyThreshold: resolved.autoApplyThreshold,
  });

  let orgDomain: string | null = null;
  if (orgRule) {
    orgDomain = resolveRuleSetValue(orgRule.value ?? "", facts);
    results.push({
      field: "org_link",
      value: orgDomain,
      confidence: orgRule.confidence,
      because: orgRule.because,
      source: orgRule.source,
      ruleId: orgRule.ruleId,
      status: orgDomain ? orgRule.status : "pending",
      evidence: { org_domain: facts.org_domain },
    });
  }

  return {
    relationshipType,
    title,
    orgDomain,
    results,
    blueprintSlug: PEOPLE_PROFILE_SLUG,
    blueprintVersion: input.blueprintVersion ?? 1,
  };
}

export { PEOPLE_PROFILE_SLUG };
