import type {
  ProfileContextFacts,
  ProfileFillRule,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import { defaultPeopleProfileRules } from "./validate-rules";

export function resolveProfileRules(input: {
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
}): {
  rules: ProfileFillRulesDocument;
  context: ProfileContextFacts;
  autoApplyThreshold: number;
  aiFallbackEnabled: boolean;
} {
  const base = input.systemRules ?? defaultPeopleProfileRules();
  const override = input.settings?.fillRulesOverride;

  const rules: ProfileFillRulesDocument = override
    ? {
        version: 1,
        fields: override.fields.length > 0 ? override.fields : base.fields,
        rules: [...override.rules, ...base.rules.filter((r) => !override.rules.some((o) => o.id === r.id))],
      }
    : base;

  return {
    rules,
    context: input.settings?.contextFacts ?? {},
    autoApplyThreshold: input.settings?.autoApplyThreshold ?? 85,
    aiFallbackEnabled: input.settings?.aiFallbackEnabled ?? true,
  };
}

export function groupProfileFillRulesByField(
  rules: ProfileFillRule[],
): Record<string, ProfileFillRule[]> {
  const grouped: Record<string, ProfileFillRule[]> = {};

  for (const rule of rules) {
    grouped[rule.field] ??= [];
    grouped[rule.field].push(rule);
  }

  return grouped;
}

export function formatRelationshipLabel(value: string | null): string {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
