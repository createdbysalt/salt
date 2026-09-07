import type { PlaybookTrigger } from "./playbooks/types";
import type { PlayArtifact } from "./play-card/types";
import type { PlayEvidenceItem } from "./lib/play-headline";
import type { PlaybookOutputType } from "./playbooks/schema/v2/types";

/**
 * Executor → UI contract for a play run. Built by
 * `lib/play-presentation.ts` (single source of truth — the executor and the
 * demo seed both go through it) and persisted on `play_runs` as columns
 * (draft_body, recipient_label, channel) plus `metadata` via
 * `buildPlayRunMetadata`.
 */
export interface PlayPresentation {
  section: string | null;
  layer: "learn" | "act";
  outputType: PlaybookOutputType;
  playbookName: string;
  /** Moment-first headline ("Frank hasn't paid INV-2026-1589"). */
  headline: string | null;
  /** "Prepared for you" — one per app Salt produced something in. */
  artifacts: PlayArtifact[];
  /** "How Salt knew" — one first-person item per input Salt considered. */
  evidence: PlayEvidenceItem[];
  /** Connector catalog ids of apps actually used in the run (max 3). */
  connectorIds: string[];
  /** Draft text for email_draft outputs (persisted as draft_body). */
  draftBody: string | null;
  recipientLabel: string | null;
  channel: string | null;
}

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
  // Written only by the executor (admin client): a claimable run that cannot
  // proceed right now — toolkit disconnected, pacing guard, or play bundle
  // exhausted. Re-approvable once the cause is fixed.
  "blocked",
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
  | "memory-care"
  | "general";

/**
 * Section-based playbook groupings (replaces players).
 *
 * The retired `_meta` section (system memory playbooks) is owned by Memory
 * Care (`app/_features/memory/care`), not by playbooks.
 */
export type PlaybookSection =
  | "relationships"
  | "work"
  | "billing"
  | "resources"
  | "meetings"
  | "me"
  | "connections"
  | "notes"
  | "communication";

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
  // Trust model approval gates (Phase 7)
  paused_at_step?: number | null;
  paused_for_approval?: boolean;
  approval_context?: {
    tool_slug: string;
    args: Record<string, unknown>;
    step_index: number;
  } | null;
  /** Set by the playbook executor on paused runs (carries playbook_slug). */
  trigger_evidence?: Record<string, unknown> | null;
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

/* ─────────────────────────────────────────────────────────────────────────────
 * Plays → Activity (run-centric)
 *
 * The Activity tab is the act-layer audit trail: one card per play run.
 * Categories derive from play_runs.state — never from activity_entries.action
 * strings (those drift; see parked/failed actions outside the CHECK constraint).
 * ──────────────────────────────────────────────────────────────────────────── */

export const PLAY_ACTIVITY_CATEGORIES = [
  "completed",
  "in-progress",
  "needs-attention",
  "decided",
] as const;

export type PlayActivityCategory = (typeof PLAY_ACTIVITY_CATEGORIES)[number];

export type PlayActivityActor = "salt" | "you";

/**
 * Bucket label for the Activity timeline. Fixed labels for recent history
 * ("Today" / "Yesterday" / "Earlier this week" / "Last week"); older runs
 * get an explicit date label like "Aug 3" ("Aug 3, 2025" across years) so
 * paginated deep history stays distinguishable.
 */
export type PlayActivityDayGroup = string;

/** Page-size options for the Activity tab's numbered pagination. */
export const ACTIVITY_PAGE_SIZES = [25, 50, 100] as const;
export type ActivityPageSize = (typeof ACTIVITY_PAGE_SIZES)[number];
export const DEFAULT_ACTIVITY_PAGE_SIZE: ActivityPageSize = 50;

/** Stat-tile counts for the Activity tab header strip. */
export interface PlayActivityCounts {
  /** Completed + Decided are all-time; In Progress + Needs Attention are live. */
  completed: number;
  decided: number;
  inProgress: number;
  needsAttention: number;
}

/** Evidence snippet attached to a run (play_run_sources). */
export interface PlayRunSourceSnippet {
  label: string | null;
  excerpt: string | null;
  external_url: string | null;
  source_type: string | null;
}

/** play_runs row enriched server-side for the Activity tab. */
export interface PlayActivityRunRow extends PlayRunRow {
  /** Resolved from the playbook registry via source_context.playbook_slug. */
  playbookName?: string | null;
  /** Playbook section — drives the activity row's icon and accent color. */
  playbookSection?: PlaybookSection | null;
  sources?: PlayRunSourceSnippet[];
  /** activity_entries for this run, newest first — timeline + undo lookup. */
  events?: ActivityEntryRow[];
}

/** UI-facing activity card view model. */
export interface PlayActivityItem {
  id: string;
  time: string;
  dayGroup: PlayActivityDayGroup;
  /** ISO timestamp used for display + grouping (ran_at ?? dismissed_at ?? updated_at). */
  sortIso: string;
  title: string;
  target: string;
  category: PlayActivityCategory;
  actor: PlayActivityActor;
  /** Row badge text, e.g. "Salt acted", "You approved", "Blocked". */
  badgeLabel: string;
  state: PlayRunState;
  playbookName: string | null;
  playbookHref: string | null;
  outcome: string | null;
  valueLabel: string | null;
  /** True when value_basis is not "actual" — UI must label estimates. */
  valueEstimated: boolean;
  triggerLabel: string | null;
  sources: { label: string; url: string | null }[];
  durationMs: number | null;
  /** Failure or blocked reason, in plain language. Raw last_error is an ops
   * signal and never reaches user UI. */
  errorLabel: string | null;
  /** Real next step from approval_context / scheduling, never hardcoded. */
  nextStepLabel: string | null;
  etaLabel: string | null;
  pausedForApproval: boolean;
  decisionLabel: string | null;
  /** How the run was authorized: Ask Salt, Queue, or autonomous. */
  approvalLabel: string | null;
  /** App the run acted in (Gmail, Stripe, …). */
  channelLabel: string | null;
  /** Playbook section — row avatar icon + accent when the run has a playbook. */
  playbookSection: PlaybookSection | null;
  timeline: { id: string; time: string; title: string; detail: string | null }[];
  /** Activity entry id that undoAutoAppliedAction accepts, when reversible. */
  undoEntryId: string | null;
  sourceUrl: string | null;
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

export interface PlayerView {
  id: string;
  slug: PlayerSlug;
  name: string;
  roleLabel: string | null;
  description: string | null;
  isActive: boolean;
}
