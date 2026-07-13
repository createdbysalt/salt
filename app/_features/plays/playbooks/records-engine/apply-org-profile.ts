import {
  evaluateFieldFromRules,
} from "./evaluate-rules";
import { resolveProfileRules } from "./resolve-rules";
import type {
  OrgProfileFacts,
  OrgRelationshipStatus,
  ProfileFieldResult,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import { defaultOrgProfileRules, resolveRuleSetValue } from "./validate-rules";

export const ORG_PROFILE_SLUG = "memory-records";

function buildOrgFacts(input: {
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  keyContactId?: string | null;
  signals?: Partial<OrgProfileFacts>;
}): OrgProfileFacts {
  const domain = input.domain?.toLowerCase().trim() || null;
  const inferredWebsite = input.website?.trim() || (domain ? `https://${domain}` : null);

  return {
    org_name: input.name,
    org_domain: domain,
    org_website: inferredWebsite,
    inferred_industry: input.industry?.trim() || input.signals?.inferred_industry || null,
    inferred_key_contact: input.keyContactId?.trim() || input.signals?.inferred_key_contact || null,
    org_domain_known: Boolean(domain),
    org_created_from_domain: Boolean(input.signals?.org_created_from_domain),
    org_has_payment_received: Boolean(input.signals?.org_has_payment_received),
    org_has_invoice_sent: Boolean(input.signals?.org_has_invoice_sent),
    org_has_primary_contact: Boolean(input.keyContactId || input.signals?.inferred_key_contact),
    org_has_people: Boolean(input.signals?.org_has_people),
    org_domain_in_partner_list: Boolean(input.signals?.org_domain_in_partner_list),
    org_domain_in_vendor_list: Boolean(input.signals?.org_domain_in_vendor_list),
  };
}

export function evaluateOrgProfileFields(input: {
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  keyContactId?: string | null;
  signals?: Partial<OrgProfileFacts>;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion?: number;
}): {
  website: string | null;
  industry: string | null;
  relationshipStatus: OrgRelationshipStatus | null;
  keyContactId: string | null;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
} {
  const resolved = resolveProfileRules({
    systemRules: input.systemRules,
    settings: input.settings,
    defaultRules: defaultOrgProfileRules(),
  });
  const facts = buildOrgFacts(input);
  const results: ProfileFieldResult[] = [];

  const fields = ["website", "industry", "relationship_status", "key_contact"] as const;
  const values: {
    website: string | null;
    industry: string | null;
    relationshipStatus: OrgRelationshipStatus | null;
    keyContactId: string | null;
  } = {
    website: null,
    industry: null,
    relationshipStatus: null,
    keyContactId: null,
  };

  for (const field of fields) {
    const ruleResult = evaluateFieldFromRules({
      field,
      rules: resolved.rules.rules,
      facts,
      context: resolved.context,
      autoApplyThreshold: resolved.autoApplyThreshold,
    });
    if (!ruleResult) continue;

    const value = resolveRuleSetValue(ruleResult.value ?? "", facts);
    if (field === "website") values.website = value;
    if (field === "industry") values.industry = value;
    if (field === "relationship_status") values.relationshipStatus = value as OrgRelationshipStatus | null;
    if (field === "key_contact") values.keyContactId = value;

    results.push({
      field,
      value,
      confidence: ruleResult.confidence,
      because: ruleResult.because,
      source: ruleResult.source,
      ruleId: ruleResult.ruleId,
      status: value ? ruleResult.status : "pending",
      evidence: {
        org_name: facts.org_name,
        org_domain: facts.org_domain,
        signal: field,
      },
    });
  }

  return {
    ...values,
    results,
    blueprintSlug: ORG_PROFILE_SLUG,
    blueprintVersion: input.blueprintVersion ?? 1,
  };
}
