/**
 * Registry-driven profile defaults.
 *
 * The field registry (`memory/taxonomy/field-registry.ts`) is the source of
 * truth for fill logic — the same rules the Memory → Customize card renders.
 * This module translates registry fillRules into the creation-time
 * ProfileFillRule shape the records engine evaluates against inline facts,
 * so a registry edit changes runtime behavior instead of drifting from a
 * hardcoded copy.
 *
 * Two signal vocabularies meet here:
 * - Registry rules key on durable entity_signals (written by producers,
 *   evaluated by the Memory Care records capability).
 * - The records engine evaluates inline facts at record-creation time.
 *
 * `signalAliases` maps a registry signal onto the engine fact that carries
 * the same meaning at creation time; `extractedTemplate` names the fact an
 * `{{extracted}}` value resolves from. Registry rules with no creation-time
 * equivalent (e.g. `work_scope_extracted`) stay with the Care capability and
 * are intentionally not mapped. Rules whose signal is outside the engine's
 * PROFILE_SIGNAL_KEYS vocabulary are skipped — the engine could never
 * evaluate them.
 */

import {
  getFieldsForEntity,
  type ContractEntityType,
} from "@/app/_features/memory/taxonomy/field-registry";
import {
  PROFILE_SIGNAL_KEYS,
  type ProfileFieldKey,
  type ProfileFillRule,
  type ProfileFillRulesDocument,
  type ProfileSignalKey,
} from "./types";

interface EngineFieldMapping {
  /** Registry field key (camelCase), e.g. "relationshipType". */
  registryKey: string;
  /** Engine field the resolver evaluates, e.g. "relationship_type". */
  field: ProfileFieldKey;
  /** Registry signal → engine signal computable at creation time. */
  signalAliases?: Record<string, ProfileSignalKey>;
  /** Fact template substituted for an "{{extracted}}" set value. */
  extractedTemplate?: string;
}

const ENGINE_SIGNALS: readonly string[] = PROFILE_SIGNAL_KEYS;

function rulesFromRegistry(
  entityType: ContractEntityType,
  mappings: EngineFieldMapping[]
): ProfileFillRule[] {
  const fields = getFieldsForEntity(entityType);
  const rules: ProfileFillRule[] = [];

  for (const mapping of mappings) {
    const field = fields.find((f) => f.key === mapping.registryKey);
    if (!field?.fillRules) continue;

    for (const rule of field.fillRules) {
      const signal = mapping.signalAliases?.[rule.signal] ?? rule.signal;
      if (!ENGINE_SIGNALS.includes(signal)) continue;

      const isExtraction = rule.value === "{{extracted}}";
      const template = mapping.extractedTemplate;
      // An extraction rule without a creation-time fact to resolve from is
      // the Care capability's job, not the engine's.
      if (isExtraction && !template) continue;

      rules.push({
        id: `${mapping.field}:${rule.signal}`,
        field: mapping.field,
        when: isExtraction
          ? { signal: signal as ProfileSignalKey, op: "exists" }
          : {
              signal: signal as ProfileSignalKey,
              op: rule.op ?? "eq",
              value: rule.opValue ?? true,
            },
        set: { value: isExtraction ? (template as string) : String(rule.value) },
        confidence: rule.confidence,
        because: rule.because,
      });
    }
  }

  return rules;
}

/**
 * Creation-time rules with no registry counterpart yet. Kept explicit (not
 * mixed into the registry) because the registry has no field for them —
 * e.g. a person's org link is a connection, not a column.
 */
const PERSON_SUPPLEMENTS: ProfileFillRule[] = [
  {
    id: "org_link:email_domain_is_personal",
    field: "org_link",
    when: { signal: "email_domain_is_personal", op: "eq", value: false },
    set: { value: "{{org_domain}}" },
    confidence: 85,
    because: "Company email domain implies an organization",
  },
];

const WORK_SUPPLEMENTS: ProfileFillRule[] = [
  {
    id: "status:work_created",
    field: "status",
    when: { signal: "work_created", op: "eq", value: true },
    set: { value: "active" },
    confidence: 90,
    because: "New work created from an explicit memory action starts active",
  },
  {
    id: "description:inferred_description",
    field: "description",
    when: { signal: "inferred_description", op: "exists" },
    set: { value: "{{inferred_description}}" },
    confidence: 80,
    because: "Direct work context includes a concise description",
  },
];

const PERSON_MAPPINGS: EngineFieldMapping[] = [
  { registryKey: "relationshipType", field: "relationship_type" },
  {
    registryKey: "title",
    field: "title",
    signalAliases: { person_title_extracted: "has_signature" },
    extractedTemplate: "{{extracted_title}}",
  },
];

const ORG_MAPPINGS: EngineFieldMapping[] = [
  {
    registryKey: "website",
    field: "website",
    signalAliases: { org_website_found: "org_domain_known" },
    extractedTemplate: "https://{{org_domain}}",
  },
  {
    registryKey: "industryParent",
    field: "industry",
    signalAliases: { org_industry_inferred: "inferred_industry" },
    extractedTemplate: "{{inferred_industry}}",
  },
  { registryKey: "relationshipType", field: "relationship_status" },
  {
    registryKey: "primaryContact",
    field: "key_contact",
    extractedTemplate: "{{inferred_key_contact}}",
  },
];

const WORK_MAPPINGS: EngineFieldMapping[] = [
  { registryKey: "status", field: "status" },
  {
    registryKey: "deadline",
    field: "deadline",
    extractedTemplate: "{{inferred_deadline}}",
  },
  {
    registryKey: "startDate",
    field: "start_date",
    extractedTemplate: "{{inferred_start_date}}",
  },
];

export function peopleDefaultsFromRegistry(): ProfileFillRulesDocument {
  return {
    version: 1,
    fields: ["relationship_type", "title", "org_link"],
    rules: [
      ...rulesFromRegistry("person", PERSON_MAPPINGS),
      ...PERSON_SUPPLEMENTS,
    ],
  };
}

export function orgDefaultsFromRegistry(): ProfileFillRulesDocument {
  return {
    version: 1,
    fields: ["website", "industry", "relationship_status", "key_contact"],
    rules: rulesFromRegistry("org", ORG_MAPPINGS),
  };
}

export function workDefaultsFromRegistry(): ProfileFillRulesDocument {
  return {
    version: 1,
    fields: ["status", "description", "deadline", "start_date"],
    rules: [...rulesFromRegistry("work", WORK_MAPPINGS), ...WORK_SUPPLEMENTS],
  };
}
