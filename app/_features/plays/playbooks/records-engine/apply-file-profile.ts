import { evaluateFieldFromRules } from "./evaluate-rules";
import { resolveProfileRules } from "./resolve-rules";
import type {
  FileCategoryValue,
  FileLifecycleValue,
  FileProfileFacts,
  ProfileFieldResult,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import { defaultFileProfileRules, resolveRuleSetValue } from "./validate-rules";

export const FILE_PROFILE_SLUG = "memory-records";

function buildFileFacts(input: {
  fileName: string;
  currentCategory?: string | null;
  currentLifecycleStatus?: string | null;
  currentOrganizationId?: string | null;
  currentPersonId?: string | null;
  currentWorkId?: string | null;
  signals?: Partial<FileProfileFacts>;
}): FileProfileFacts {
  return {
    file_name: input.fileName,
    current_category: input.currentCategory ?? null,
    current_lifecycle_status: input.currentLifecycleStatus ?? null,
    current_organization_id: input.currentOrganizationId ?? null,
    current_person_id: input.currentPersonId ?? null,
    current_work_id: input.currentWorkId ?? null,
    file_signature_event_sent: Boolean(input.signals?.file_signature_event_sent),
    file_signature_event_viewed: Boolean(input.signals?.file_signature_event_viewed),
    file_signature_event_signed: Boolean(input.signals?.file_signature_event_signed),
    file_signature_event_expired: Boolean(input.signals?.file_signature_event_expired),
    file_source_context_match: Boolean(input.signals?.file_source_context_match),
    inferred_category: input.signals?.inferred_category ?? null,
    inferred_document_type: input.signals?.inferred_document_type ?? null,
    inferred_due_date: input.signals?.inferred_due_date ?? null,
    inferred_expiry_date: input.signals?.inferred_expiry_date ?? null,
    inferred_signed_date: input.signals?.inferred_signed_date ?? null,
    inferred_organization_id: input.signals?.inferred_organization_id ?? null,
    inferred_person_id: input.signals?.inferred_person_id ?? null,
    inferred_work_id: input.signals?.inferred_work_id ?? null,
  };
}

export function evaluateFileProfileFields(input: {
  fileName: string;
  currentCategory?: string | null;
  currentLifecycleStatus?: string | null;
  currentOrganizationId?: string | null;
  currentPersonId?: string | null;
  currentWorkId?: string | null;
  signals?: Partial<FileProfileFacts>;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion?: number;
}): {
  category: FileCategoryValue | null;
  lifecycleStatus: FileLifecycleValue | null;
  organizationId: string | null;
  personId: string | null;
  workId: string | null;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
} {
  const resolved = resolveProfileRules({
    systemRules: input.systemRules,
    settings: input.settings,
    defaultRules: defaultFileProfileRules(),
  });
  const facts = buildFileFacts(input);
  const results: ProfileFieldResult[] = [];

  const fields = ["category", "lifecycle_status", "organizationId", "personId", "workId"] as const;
  const values: {
    category: FileCategoryValue | null;
    lifecycleStatus: FileLifecycleValue | null;
    organizationId: string | null;
    personId: string | null;
    workId: string | null;
  } = {
    category: null,
    lifecycleStatus: null,
    organizationId: null,
    personId: null,
    workId: null,
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
    if (field === "category") values.category = value as FileCategoryValue | null;
    if (field === "lifecycle_status") values.lifecycleStatus = value as FileLifecycleValue | null;
    if (field === "organizationId") values.organizationId = value;
    if (field === "personId") values.personId = value;
    if (field === "workId") values.workId = value;

    results.push({
      field,
      value,
      confidence: ruleResult.confidence,
      because: ruleResult.because,
      source: ruleResult.source,
      ruleId: ruleResult.ruleId,
      status: value ? ruleResult.status : "pending",
      evidence: {
        file_name: facts.file_name,
        current_category: facts.current_category,
        signal: field,
      },
    });
  }

  return {
    ...values,
    results,
    blueprintSlug: FILE_PROFILE_SLUG,
    blueprintVersion: input.blueprintVersion ?? 1,
  };
}
