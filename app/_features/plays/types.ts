import type { PlaybookTrigger } from "./playbooks/types";

// Queue types for two-queue routing (LEARN → ACT → GROW)
export const PLAY_QUEUES = ["needs_you", "auto_handled"] as const;
export type PlayQueue = (typeof PLAY_QUEUES)[number];

// Stakes classification for routing decisions
export const PLAY_STAKES = ["low", "medium", "high"] as const;
export type PlayStakes = (typeof PLAY_STAKES)[number];

// Source attribution for play creation
export const PLAY_SOURCES = ["ask_salt", "playbook", "manual", "system"] as const;
export type PlaySource = (typeof PLAY_SOURCES)[number];

export const PLAY_RUN_STATES = [
  "draft",
  "queued",
  "approved",
  "scheduled",
  "executing",
  "ran",
  "failed",
  "dismissed",
] as const;

export type PlayRunState = (typeof PLAY_RUN_STATES)[number];

export const PLAY_VALUE_KINDS = [
  "invoice_collected",
  "invoice_sent",
  "booking_created",
  "time_saved",
  "gap_closed",
] as const;

export type PlayValueKind = (typeof PLAY_VALUE_KINDS)[number];

/** "estimated" until a connector read proves the outcome; never overclaim in UI. */
export type PlayValueBasis = "estimated" | "actual";

/**
 * @deprecated Use PlaybookSection instead. Players have been retired in favor of section-based groupings.
 */
export type PlayerSlug =
  | "follow-up"
  | "brief"
  | "client-risk"
  | "scope"
  | "billing"
  | "keeper"
  | "general";

/**
 * Section-based playbook groupings (replaces players).
 */
export type PlaybookSection =
  | "relationships"
  | "work"
  | "billing"
  | "files"
  | "meetings"
  | "me"
  | "connections"
  | "notes"
  | "_meta";

export type PlaybookKind = "acting" | "profile";

export type PlayChannel = "Gmail" | "Slack" | "Notion" | "Memory" | "Stripe";

export interface PlayRunRow {
  id: string;
  workspace_id: string;
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
  last_error: string | null;
  metadata: Record<string, unknown> | null;
  context_inputs?: Record<string, unknown> | null;
  evidence_ids?: string[] | null;
  // Two-queue routing (LEARN → ACT → GROW)
  queue?: PlayQueue | null;
  stakes?: PlayStakes | null;
  source_context?: {
    source: PlaySource;
    chat_id?: string;
    message_id?: string;
    user_approved_at?: string;
    playbook_slug?: string;
    trigger_signal?: string;
  } | null;
  value_kind: PlayValueKind | null;
  value_amount: number | null;
  value_currency: string | null;
  value_basis: PlayValueBasis | null;
  value_attributed_at: string | null;
  created_at: string;
  updated_at: string;
  player_slug?: string | null;
  player_name?: string | null;
}

export interface PlayTemplateRow {
  id: string;
  workspace_id: string;
  player_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  default_channel: string | null;
  is_active: boolean;
  required_actions: string[];
  approved_actions: string[];
  actions_approved_by: string | null;
  actions_approved_at: string | null;
  /** Compiled step list (see utils/play-definition.ts). Null = draft-only template. */
  definition: unknown | null;
  /** Human-readable procedure — the MD authoring layer the GROW loop patches. */
  procedure_md: string | null;
  blueprint_slug: string | null;
  blueprint_version: number | null;
  created_at: string;
  updated_at: string;
}

export type PlayRunAssignmentRole = "owner" | "executor" | "reviewer" | "approver" | "watcher";
export type PlayRunAssignmentStatus = "assigned" | "in_progress" | "completed" | "dismissed";

export interface PlayRunAssignmentRow {
  id: string;
  workspace_id: string;
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
  workspace_id: string;
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
  workspace_id: string;
  play_run_id: string | null;
  actor_user_id: string | null;
  action: string;
  title: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  /** Deep link to source email/thread when resolvable. */
  source_url?: string | null;
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

export type PlaybookOrigin = "salt" | "user";

export interface PlaybookBlueprintView {
  slug: string;
  name: string;
  kind: PlaybookKind;
  playerSlug: PlayerSlug;
  description: string | null;
  whenToUse: string | null;
  trigger: PlaybookTrigger;
  version: number;
  stepCount: number;
  requiredActions: string[];
  reliabilityLabel: string | null;
  fillRuleCount: number;
  procedureMd: string | null;
  /** 'salt' = system, 'user' = user-created. */
  origin: PlaybookOrigin;
}

export interface PlayTemplateView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  playerSlug: PlayerSlug | null;
  blueprintSlug: string | null;
  blueprintVersion: number | null;
  isActive: boolean;
  upgradeAvailable: boolean;
}

export interface PlayerView {
  id: string;
  slug: PlayerSlug;
  name: string;
  roleLabel: string | null;
  description: string | null;
  isActive: boolean;
}
