import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import type { PlayerId } from "@/app/_lib/demo/plays-demo-data";

/**
 * Play Card contract — the single UI model every queue item maps into.
 *
 * See docs/plans/2026-06-25-play-card-contract.md.
 *
 * `PlayCardKind` values (`acting`, `profile`, `question`, `risk`, `routing`) are
 * INTERNAL code terms only. They pick a body layout. They must NEVER appear in
 * UI copy, labels, chips, or filters. Users only ever see the playbook name and
 * the action verb.
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
      apply: "keeper_profile" | "memory_plan" | "act";
      flagged: boolean;
    };

/** One-tap answer for a `question` body. */
export interface PlayCardQuestionOption {
  value: string;
  label: string;
}

export interface PlayCardViewModel {
  id: string;
  kind: PlayCardKind;
  /** Defaults to "needs_you" when omitted. */
  mode?: PlayCardMode;

  // Attribution (required) — Player is shown as a name, never a category chip.
  playerSlug: PlayerId;
  playerName: string;
  playbookName: string | null;

  // Decision context (required-ish)
  subject: string;
  targetLabel: string | null;
  targetPrefix: PlayCardTargetPrefix;
  preview: string | null;
  confidence: number | null;
  ageMinutes: number | null;
  triggerLabel: string | null;
  channel: string | null;
  sourceUrl?: string | null;

  // Body (exactly one matching `kind`, validated by validate-play-card.ts)
  acting?: { draftBody: string[]; recipientLabel: string };
  profile?: { field: string; proposedValue: string; because: string | null };
  question?: { field: string; prompt: string; options: PlayCardQuestionOption[] };
  risk?: { signal: string; recommendation: string };

  /** Present only when `mode === "handled"`. */
  handled?: { outcomeLabel: string; changeLine: string | null; handledAt: string };

  // Footer actions
  primaryAction: { label: string; kind: PlayCardActionKind } | null;
  canFlag: boolean;
  canSchedule: boolean;

  // Trust + routing
  provenance: PlayCardProvenance;
  askSalt: AskSaltContext;
}
