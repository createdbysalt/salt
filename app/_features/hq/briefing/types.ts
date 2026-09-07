export const DAILY_BRIEFING_CRON = "0 9 * * 1-5";
export const DAILY_BRIEFING_TIMEZONE = "America/Toronto";

export interface DailyBriefingSections {
  urgent: string[];
  today: string[];
  relationships: string[];
}

export interface DailyBriefing {
  id: string;
  workspaceId: string;
  briefingDate: string;
  content: string;
  sections: DailyBriefingSections;
  model: string | null;
  createdAt: string;
}

export interface OverdueBillingItem {
  id: string;
  label: string;
  amountCents: number;
  daysOverdue: number;
  number: string | null;
}

export interface BlockedWorkItem {
  id: string;
  name: string;
  blockerReason: string;
}

export interface TodayMeetingItem {
  id: string;
  title: string;
  startTime: string;
  who: string | null;
}

export interface SilentRelationshipItem {
  id: string;
  name: string;
  relationshipType: string | null;
  daysSinceContact: number | null;
}

export interface BriefingOpportunityGap {
  claim: string;
  summary: string | null;
  amountLabel: string | null;
}

export interface BriefingInputs {
  overdueBilling: OverdueBillingItem[];
  blockedWork: BlockedWorkItem[];
  todayMeetings: TodayMeetingItem[];
  silentRelationships: SilentRelationshipItem[];
  opportunityGap: BriefingOpportunityGap | null;
}

export type GenerateDailyBriefingStatus =
  | "created"
  | "already_exists"
  | "skipped_empty"
  | "skipped_no_draft"
  | "error";

export interface GenerateDailyBriefingResult {
  status: GenerateDailyBriefingStatus;
  briefingId?: string;
  error?: string;
}

export interface BriefingDraft {
  content: string;
  sections: DailyBriefingSections;
}
