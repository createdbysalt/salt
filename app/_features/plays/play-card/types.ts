import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import type {
  PlaybookSection,
  PlaybookLayer,
  PlaybookOutputType,
  PlaybookApprovalMode,
} from "@/app/_features/plays/playbooks/schema/v2/types";

/**
 * Play Card contract — the single UI model every queue item maps into.
 *
 * See docs/plans/2026-06-25-play-card-contract.md.
 *
 * `PlayCardKind` values (`acting`, `profile`, `question`, `risk`, `routing`) are
 * INTERNAL code terms only. They pick a body layout. They must NEVER appear in
 * UI copy, labels, chips, or filters. Users only ever see the playbook name and
 * the action verb.
 *
 * @deprecated Use `outputType` from v2 playbook instead. Kind is derived for
 * backward compatibility but will be removed once all cards flow through v2.
 */
export type PlayCardKind = "acting" | "profile" | "question" | "risk" | "routing";

/**
 * Whether the card is awaiting a decision or already applied. `handled` cards
 * render a compact, past-tense variant (no approve; Undo + Correct only).
 */
export type PlayCardMode = "needs_you" | "handled";

/** What the primary button does. The container dispatches based on this + provenance. */
export type PlayCardActionKind =
  | "approve_send"
  | "apply_memory"
  | "act"
  | "answer";

/** How the target relates to the play — drives the "To / For / From" prefix. */
export type PlayCardTargetPrefix = "To" | "For" | "From";

/**
 * Where this card came from. The container uses this to route approve/dismiss/
 * flag/apply to the correct server action. UI never reads provenance for display.
 */
export type PlayCardProvenance =
  | { source: "play_run"; playRunId: string }
  | {
      source: "finding";
      findingId: string;
      /** Which finding apply path the primary action should call. */
      apply: "memory_care" | "memory_plan" | "act";
      flagged: boolean;
    };

/** One app-specific artifact prepared during a play run. */
export interface PlayArtifact {
  /** Connector catalog id for the app glyph (e.g. "google", "stripe"). */
  appId: string;
  /** What it is: "Follow-up draft to Dana", "Kickoff call event". */
  label: string;
  /** Link to view the resource in the external app. */
  url?: string | null;
  /** Editable message/email content, when the artifact is a draft. */
  draftBody?: string[];
}

/** One-tap answer for a `question` body. */
export interface PlayCardQuestionOption {
  value: string;
  label: string;
}

/**
 * Error states that can affect card rendering or actions.
 * Cards with errors are still rendered but with degraded UX.
 */
export interface PlayCardErrorState {
  /** Playbook slug was provided but lookup failed. */
  playbookNotFound?: boolean;
  /** Target entity (person/org/work) no longer exists. */
  entityDeleted?: boolean;
  /** Draft body is empty for an email_draft play. */
  draftIncomplete?: boolean;
  /** Source capture/email no longer exists. */
  sourceUnavailable?: boolean;
  /** Generic error message to display. */
  message?: string;
}

export interface PlayCardViewModel {
  id: string;
  /**
   * @deprecated Derived from `outputType` for backward compatibility.
   * Use `outputType` to determine card body layout.
   */
  kind: PlayCardKind;
  /** Defaults to "needs_you" when omitted. */
  mode?: PlayCardMode;

  // ─────────────────────────────────────────────────────────────────────────────
  // V2 Attribution (preferred) — Section · Playbook
  // ─────────────────────────────────────────────────────────────────────────────
  /** v2 playbook slug from source_context.playbook_slug */
  playbookSlug?: string | null;
  /** v2 playbook name for display */
  playbookName: string | null;
  /** v2 section (relationships, billing, etc.) */
  section?: PlaybookSection | null;
  /** v2 section display label */
  sectionLabel?: string | null;
  /** v2 layer: learn (memory) or act (action) */
  layer?: PlaybookLayer | null;
  /** v2 output type: email_draft, memory_update, notification, etc. */
  outputType?: PlaybookOutputType | null;
  /** v2 output gate after parse-time normalization: auto or ask */
  approvalMode?: PlaybookApprovalMode | null;
  /** v2 auto-apply threshold (for learn layer) */
  autoApplyThreshold?: number | null;
  /** v2 confidence explanation from policy */
  confidenceExplanation?: string | null;
  /** v2 value estimate (e.g., "~10 min saved") */
  valueEstimate?: string | null;

  // ─────────────────────────────────────────────────────────────────────────────
  // Legacy Attribution (deprecated) — Player-based
  // ─────────────────────────────────────────────────────────────────────────────
  /**
   * @deprecated Use `section` instead. Players are retired. Sourced from
   * `play_runs.player_slug` only — never resolved through demo data.
   */
  playerSlug: string | null;
  /**
   * @deprecated Use `sectionLabel` instead. Players are retired. Sourced from
   * `play_runs.player_name` only — null when the row carries no legacy name.
   */
  playerName: string | null;

  // Decision context (required-ish)
  subject: string;
  /**
   * Moment-first display headline ("Kickoff with Meridian at 2pm — brief is
   * ready"). Falls back to `subject` when absent. See lib/play-headline.ts.
   */
  headline?: string | null;
  targetLabel: string | null;
  targetPrefix: PlayCardTargetPrefix;
  preview: string | null;
  confidence: number | null;
  stakes: "low" | "medium" | "high" | null;
  ageMinutes: number | null;
  triggerLabel: string | null;
  channel: string | null;
  sourceUrl?: string | null;

  /** Run progress for the card face: "Step 2 of 3 — needs you". */
  stepPosition?: { current: number; total: number | null; label: string | null } | null;

  /** Honest source list for the detail popup. See lib/play-headline.ts. */
  evidence?: import("../lib/play-headline").PlayEvidence | null;

  /**
   * Per-app artifacts Salt prepared for this run (drafts, links).
   * Written by the executor as metadata.artifacts; the modal's "Prepared
   * for you" section renders one row per artifact — never decorative apps.
   */
  artifacts?: PlayArtifact[] | null;

  // Body (exactly one matching `kind`, validated by validate-play-card.ts)
  acting?: { draftBody: string[]; recipientLabel: string };
  profile?: { field: string; proposedValue: string; because: string | null };
  question?: { field: string; prompt: string; options: PlayCardQuestionOption[] };
  risk?: { signal: string; recommendation: string };
  routing?: { fromEmail: string; fromName: string | null; paymentPayerHint: string | null };

  /** Present only when `mode === "handled"`. */
  handled?: { outcomeLabel: string; changeLine: string | null; handledAt: string };

  // Footer actions
  primaryAction: { label: string; kind: PlayCardActionKind } | null;
  canFlag: boolean;
  canSchedule: boolean;

  // Trust + routing
  provenance: PlayCardProvenance;
  askSalt: AskSaltContext;

  // Error state (optional — present when card has issues)
  error?: PlayCardErrorState;

  /**
   * Execution chain for paused playbook runs: what already auto-ran and what
   * is waiting on the user. Built from play_runs.metadata.step_history +
   * approval_context. Undefined for non-paused cards.
   */
  chain?: {
    steps: Array<{ id: string; label: string; status: "done" | "skipped" | "failed" }>;
    pending: { label: string; tool?: string; blocked?: boolean };
  };
}
