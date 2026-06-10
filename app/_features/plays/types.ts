export const PLAY_RUN_STATES = [
  "draft",
  "queued",
  "approved",
  "scheduled",
  "ran",
  "dismissed",
] as const;

export type PlayRunState = (typeof PLAY_RUN_STATES)[number];

export type PlayerSlug =
  | "follow-up"
  | "brief"
  | "client-risk"
  | "scope"
  | "billing";

export type PlayChannel = "Gmail" | "Slack" | "Notion" | "Memory" | "Stripe";

export interface PlayRunRow {
  id: string;
  studio_id: string;
  player_id: string | null;
  prepared_by_player_id: string | null;
  template_id: string | null;
  opportunity_gap_id: string | null;
  owner_member_id: string | null;
  owner_team_id: string | null;
  space_id: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  state: PlayRunState;
  title: string;
  preview: string | null;
  recipient_label: string | null;
  channel: string | null;
  channels: string[] | null;
  draft_body: string | null;
  confidence: number | null;
  eta_label: string | null;
  scheduled_for: string | null;
  approved_at: string | null;
  ran_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
  player_slug?: string | null;
  player_name?: string | null;
}

export type PlayRunAssignmentRole = "owner" | "executor" | "reviewer" | "approver" | "watcher";
export type PlayRunAssignmentStatus = "assigned" | "in_progress" | "completed" | "dismissed";

export interface PlayRunAssignmentRow {
  id: string;
  studio_id: string;
  play_run_id: string;
  assignee_member_id: string | null;
  assignee_team_id: string | null;
  role: PlayRunAssignmentRole;
  status: PlayRunAssignmentStatus;
  due_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityGapRow {
  id: string;
  studio_id: string;
  claim: string;
  summary: string | null;
  amount_min: number | null;
  amount_max: number | null;
  currency: string | null;
  confidence: number | null;
  category: string | null;
  is_primary: boolean;
  sources: unknown;
  dismissed_at: string | null;
  created_at: string;
}

export interface ActivityEntryRow {
  id: string;
  studio_id: string;
  play_run_id: string | null;
  actor_user_id: string | null;
  action: string;
  title: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** UI-facing queue item aligned with plays-demo-data QueuePlay */
export interface QueuePlayView {
  id: string;
  playerId: PlayerSlug;
  playbook: string;
  subject: string;
  recipient: string;
  source: string;
  channel: PlayChannel;
  draftBody: string[];
  ageMin: number;
  confidence: number;
}

export interface HqBriefingData {
  primaryOpportunity: {
    claim: string;
    summary: string | null;
    amountLabel: string | null;
    confidence: number | null;
  } | null;
  playsRanToday: number;
  playsAwaitingApproval: number;
  clearedAmountLabel: string | null;
  autoSentCount: number;
}

export interface HqQueuePlayView {
  id: string;
  playerId: PlayerSlug;
  playbook: string;
  title: string;
  preview: string;
  recipient: string;
  channel: PlayChannel;
  channels?: PlayChannel[];
  eta: string;
  confidence: number;
}
