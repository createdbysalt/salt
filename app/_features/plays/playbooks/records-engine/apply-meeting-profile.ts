import { evaluateFieldFromRules } from "./evaluate-rules";
import { resolveProfileRules } from "./resolve-rules";
import type {
  MeetingProfileFacts,
  MeetingStatusValue,
  MeetingTypeValue,
  ProfileFieldResult,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import { defaultMeetingProfileRules, resolveRuleSetValue } from "./validate-rules";

export const MEETING_PROFILE_SLUG = "keeper-meetings-records";

function buildMeetingFacts(input: {
  title: string;
  currentStatus?: string | null;
  currentMeetingType?: string | null;
  currentOrganizationId?: string | null;
  currentPersonId?: string | null;
  currentWorkId?: string | null;
  signals?: Partial<MeetingProfileFacts>;
}): MeetingProfileFacts {
  return {
    meeting_title: input.title,
    current_status: input.currentStatus ?? null,
    current_meeting_type: input.currentMeetingType ?? null,
    current_organization_id: input.currentOrganizationId ?? null,
    current_person_id: input.currentPersonId ?? null,
    current_work_id: input.currentWorkId ?? null,
    meeting_synced_from_calendar: Boolean(input.signals?.meeting_synced_from_calendar),
    meeting_end_passed: Boolean(input.signals?.meeting_end_passed),
    meeting_has_attendance_evidence: Boolean(input.signals?.meeting_has_attendance_evidence),
    meeting_cancelled_by_calendar: Boolean(input.signals?.meeting_cancelled_by_calendar),
    meeting_attendee_email_match: Boolean(input.signals?.meeting_attendee_email_match),
    inferred_meeting_type: input.signals?.inferred_meeting_type ?? null,
    inferred_organization_id: input.signals?.inferred_organization_id ?? null,
    inferred_person_id: input.signals?.inferred_person_id ?? null,
    inferred_work_id: input.signals?.inferred_work_id ?? null,
  };
}

export function evaluateMeetingProfileFields(input: {
  title: string;
  currentStatus?: string | null;
  currentMeetingType?: string | null;
  currentOrganizationId?: string | null;
  currentPersonId?: string | null;
  currentWorkId?: string | null;
  signals?: Partial<MeetingProfileFacts>;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion?: number;
}): {
  status: MeetingStatusValue | null;
  meetingType: MeetingTypeValue | null;
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
    defaultRules: defaultMeetingProfileRules(),
  });
  const facts = buildMeetingFacts(input);
  const results: ProfileFieldResult[] = [];

  const fields = ["status", "meeting_type", "organizationId", "personId", "workId"] as const;
  const values: {
    status: MeetingStatusValue | null;
    meetingType: MeetingTypeValue | null;
    organizationId: string | null;
    personId: string | null;
    workId: string | null;
  } = {
    status: null,
    meetingType: null,
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
    if (field === "status") values.status = value as MeetingStatusValue | null;
    if (field === "meeting_type") values.meetingType = value as MeetingTypeValue | null;
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
        meeting_title: facts.meeting_title,
        current_status: facts.current_status,
        signal: field,
      },
    });
  }

  return {
    ...values,
    results,
    blueprintSlug: MEETING_PROFILE_SLUG,
    blueprintVersion: input.blueprintVersion ?? 1,
  };
}
