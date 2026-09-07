import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import { getPlaybookBySlug } from "../playbooks/schema/v2/discovery";
import {
  SECTION_METADATA,
  type PlaybookSection,
  type PlaybookOutputType,
  type PlaybookLayer,
  type PlaybookApprovalMode,
} from "../playbooks/schema/v2/types";
import type { PlayRunRow } from "../types";
import type { PlayCardViewModel, PlayCardKind, PlayCardErrorState } from "./types";
import { resolveEmailSubject } from "../lib/draft-preview";
import { draftParagraphsWithPayLinks } from "../lib/draft-payment-link";

/**
 * V2 playbook resolution result.
 * Contains all fields derivable from a v2 playbook definition.
 */
interface V2Resolution {
  playbookSlug: string;
  playbookName: string;
  section: PlaybookSection;
  sectionLabel: string;
  layer: PlaybookLayer;
  outputType: PlaybookOutputType;
  approvalMode: PlaybookApprovalMode;
  autoApplyThreshold: number | null;
  confidenceExplanation: string | null;
  valueEstimate: string | null;
  /** True if playbook_slug was provided but lookup failed. */
  notFound?: boolean;
}

/**
 * Resolve v2 playbook fields from source_context.playbook_slug.
 * Returns partial resolution with notFound flag if playbook lookup fails.
 */
function resolveV2Playbook(row: PlayRunRow): V2Resolution | null {
  const playbookSlug = row.source_context?.playbook_slug;
  if (!playbookSlug) return null;

  const parsed = getPlaybookBySlug(playbookSlug);
  if (!parsed) {
    console.warn(`[mapPlayRunToCard] Playbook not found: ${playbookSlug}`);
    return {
      playbookSlug,
      playbookName: "Unknown playbook",
      section: "work",
      sectionLabel: "Work",
      layer: "learn",
      outputType: "memory_update",
      approvalMode: "ask",
      autoApplyThreshold: null,
      confidenceExplanation: null,
      valueEstimate: null,
      notFound: true,
    };
  }

  const def = parsed.definition;
  const sectionMeta = SECTION_METADATA[def.section];

  return {
    playbookSlug: def.slug,
    playbookName: def.name,
    section: def.section,
    sectionLabel: sectionMeta?.name ?? def.section,
    layer: def.layer,
    outputType: def.output.type,
    approvalMode: def.output.approval ?? "ask",
    autoApplyThreshold: def.policy?.auto_apply_threshold ?? null,
    confidenceExplanation: def.policy?.confidence_explanation ?? null,
    valueEstimate: def.value?.estimate ? `~${def.value.estimate} min saved` : null,
  };
}

/**
 * Detect error conditions in a play_run.
 */
function detectErrors(row: PlayRunRow, v2: V2Resolution | null): PlayCardErrorState | undefined {
  const errors: PlayCardErrorState = {};
  let hasErrors = false;

  // Playbook not found
  if (v2?.notFound) {
    errors.playbookNotFound = true;
    errors.message = "Playbook unavailable";
    hasErrors = true;
  }

  // Empty draft for email plays
  const isEmailDraft = v2?.outputType === "email_draft" || Boolean(row.draft_body);
  if (isEmailDraft && !row.draft_body?.trim()) {
    errors.draftIncomplete = true;
    if (!errors.message) errors.message = "Draft incomplete";
    hasErrors = true;
  }

  return hasErrors ? errors : undefined;
}

/**
 * Derive PlayCardKind from v2 outputType for backward compatibility.
 */
function kindFromOutputType(outputType: PlaybookOutputType): PlayCardKind {
  switch (outputType) {
    case "email_draft":
      return "acting";
    case "memory_update":
      return "profile";
    case "notification":
    case "finding":
      return "risk";
    case "briefing":
      return "risk";
    default:
      return "risk";
  }
}

/**
 * Map a database play_run row into the unified PlayCardViewModel.
 *
 * This is the canonical mapper for actual persisted plays (vs demo data).
 * All acting plays (prepared sends) and future records-type plays written
 * to play_runs should flow through here.
 *
 * V2-first: Attempts to resolve playbook via source_context.playbook_slug.
 * Legacy player attribution is passed through from the row as-is; it is never
 * resolved through demo-player data.
 */
export function mapPlayRunToCard(row: PlayRunRow): PlayCardViewModel {
  // V2-first: try to resolve from playbook definition
  const v2 = resolveV2Playbook(row);

  // Detect error conditions
  const error = detectErrors(row, v2);

  // Legacy attribution (deprecated) — pass-through, no demo-player fallback
  const playerSlug = row.player_slug ?? null;
  const kind = v2 ? kindFromOutputType(v2.outputType) : resolveKind(row);

  const ageMinutes = Math.round(
    (Date.now() - new Date(row.created_at).getTime()) / 60_000
  );

  const draftBody = draftParagraphsWithPayLinks(row.draft_body, {
    invoiceContext: row.context_inputs?.invoice_context,
    artifacts: row.metadata?.artifacts,
    verifyText: row.context_inputs?.verify_unpaid,
  });

  const askSalt: AskSaltContext = {
    type: "play",
    id: row.id,
    title: row.title,
    recipientLabel: row.recipient_label ?? row.target_label ?? "this record",
    sourceLabel: v2?.sectionLabel ?? row.player_name ?? "Salt",
    href: "/plays",
  };

  return {
    id: row.id,
    kind,

    // V2 attribution (preferred)
    playbookSlug: v2?.playbookSlug ?? row.source_context?.playbook_slug ?? null,
    playbookName: v2?.playbookName ?? readMetadataString(row, "playbook_name"),
    section: v2?.section ?? null,
    sectionLabel: v2?.sectionLabel ?? null,
    layer: v2?.layer ?? null,
    outputType: v2?.outputType ?? null,
    approvalMode: v2?.approvalMode ?? null,
    autoApplyThreshold: v2?.autoApplyThreshold ?? null,
    confidenceExplanation: v2?.confidenceExplanation ?? null,
    valueEstimate: v2?.valueEstimate ?? null,

    // Legacy attribution (deprecated)
    playerSlug,
    playerName: row.player_name ?? null,

    subject: row.title,
    targetLabel: row.recipient_label ?? row.target_label,
    targetPrefix: kind === "acting" ? "To" : "For",
    preview:
      row.paused_for_approval && row.approval_context
        ? row.state === "blocked"
          ? // Blocked previews carry executor internals ("Parked: <reason>") —
            // ops detail that stays out of user UI. Friendly fixed copy here;
            // the founder can query play_runs.last_error.
            "Paused — a connection needs attention. Reconnect, then approve to resume."
          : `Waiting for approval: ${formatToolSlug(row.approval_context.tool_slug)}`
        : row.preview,
    confidence: row.confidence,
    stakes: (row.stakes as "low" | "medium" | "high" | null) ?? null,
    ageMinutes,
    triggerLabel: v2 ? row.source_context?.trigger_signal ?? null : readMetadataString(row, "trigger_label"),
    channel: row.channel,
    sourceUrl: readMetadataString(row, "source_url"),

    acting:
      kind === "acting"
        ? {
            draftBody,
            recipientLabel: row.recipient_label ?? row.target_label ?? "",
            emailSubject: resolveEmailSubject({
              draftBody: row.draft_body,
              approvalSubject: row.approval_context?.args?.subject,
            }),
          }
        : undefined,

    profile:
      kind === "profile"
        ? {
            field: readMetadataString(row, "profile_field") ?? "",
            proposedValue: readMetadataString(row, "profile_value") ?? "",
            because: v2?.confidenceExplanation ?? readMetadataString(row, "because"),
          }
        : undefined,

    question:
      kind === "question"
        ? {
            field: readMetadataString(row, "question_field") ?? "",
            prompt: row.preview ?? row.title,
            options: readMetadataOptions(row),
          }
        : undefined,

    risk:
      kind === "risk"
        ? {
            signal: readMetadataString(row, "risk_signal") ?? row.preview ?? row.title,
            recommendation: readMetadataString(row, "risk_recommendation") ?? "",
          }
        : undefined,

    routing:
      kind === "routing"
        ? {
            fromEmail: readMetadataString(row, "from_email") ?? "",
            fromName: readMetadataString(row, "from_name"),
            paymentPayerHint: readMetadataString(row, "payment_payer_hint"),
          }
        : undefined,

    primaryAction:
      kind === "acting"
        ? { label: "Approve & send", kind: "approve_send" }
        : kind === "profile"
          ? { label: readMetadataString(row, "primary_label") ?? "Save to Memory", kind: "apply_memory" }
          : kind === "question"
            ? null
            : { label: readMetadataString(row, "primary_label") ?? "Act", kind: "act" },

    canFlag: kind !== "acting",
    canSchedule: kind === "acting",

    provenance: { source: "play_run", playRunId: row.id },
    askSalt,

    // Error state (if any)
    error,

    // Execution chain for paused runs (steps auto-ran → pending action)
    chain: buildChain(row),
  };
}

type StepHistoryEntry = { id: string; kind: string; status: string };

function readStepHistory(row: PlayRunRow): StepHistoryEntry[] {
  const meta = row.metadata;
  if (!meta || typeof meta !== "object") return [];
  const raw = (meta as Record<string, unknown>).step_history;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is StepHistoryEntry =>
      !!e &&
      typeof e === "object" &&
      typeof (e as StepHistoryEntry).id === "string" &&
      typeof (e as StepHistoryEntry).status === "string"
  );
}

function humanizeStepId(id: string): string {
  return id.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildChain(
  row: PlayRunRow
): PlayCardViewModel["chain"] | undefined {
  if (!row.paused_for_approval || !row.approval_context) return undefined;

  const history = readStepHistory(row);
  const steps: Array<{ id: string; label: string; status: "done" | "skipped" | "failed" }> = [];

  for (const entry of history) {
    if (entry.status === "paused") continue; // the pending step renders separately
    const data = row.context_inputs?.[entry.id];
    const count = Array.isArray(data) ? data.length : null;
    const label =
      count != null && count > 0
        ? `${humanizeStepId(entry.id)} · ${count}`
        : humanizeStepId(entry.id);
    steps.push({
      id: entry.id,
      label,
      status:
        entry.status === "success"
          ? "done"
          : entry.status === "skipped"
            ? "skipped"
            : "failed",
    });
  }

  // Fallback for runs written before step_history existed: show the steps
  // declared before paused_at_step from the playbook definition.
  if (steps.length === 0) {
    const slug = row.source_context?.playbook_slug;
    const def = slug ? getPlaybookBySlug(slug)?.definition : null;
    const at = row.paused_at_step ?? row.approval_context.step_index;
    if (def?.steps && typeof at === "number") {
      for (const s of def.steps.slice(0, at)) {
        const id = s.id ?? "step";
        steps.push({ id, label: humanizeStepId(id), status: "done" });
      }
    }
  }

  if (steps.length === 0) return undefined;

  const blocked = row.state === "blocked";
  return {
    steps,
    pending: {
      label: blocked
        ? "Reconnect, then approve to resume"
        : `Approve: ${formatToolSlug(row.approval_context.tool_slug)}`,
      tool: row.approval_context.tool_slug,
      blocked,
    },
  };
}

function resolveKind(row: PlayRunRow): PlayCardKind {
  const meta = row.metadata;
  if (meta && typeof meta === "object") {
    if (meta.play_card_kind && typeof meta.play_card_kind === "string") {
      if (isValidKind(meta.play_card_kind)) return meta.play_card_kind;
    }
    // Accepts the retired keeper_* metadata keys as legacy fallbacks.
    if (meta.memory_care_question === true || meta.keeper_question === true) {
      return "question";
    }
    if (meta.memory_care_profile === true || meta.keeper_profile === true) {
      return "profile";
    }
  }
  if (row.draft_body) return "acting";
  return "risk";
}

function isValidKind(kind: string): kind is PlayCardKind {
  return ["acting", "profile", "question", "risk", "routing"].includes(kind);
}

function readMetadataString(row: PlayRunRow, key: string): string | null {
  const meta = row.metadata;
  if (!meta || typeof meta !== "object") return null;
  const value = meta[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readMetadataOptions(
  row: PlayRunRow
): Array<{ value: string; label: string }> {
  const meta = row.metadata;
  if (!meta || typeof meta !== "object") return [];
  const raw = meta.question_options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((opt) => {
      if (!opt || typeof opt !== "object") return null;
      const rec = opt as Record<string, unknown>;
      if (typeof rec.value !== "string" || typeof rec.label !== "string") return null;
      return { value: rec.value, label: rec.label };
    })
    .filter((opt): opt is { value: string; label: string } => opt !== null);
}

function formatToolSlug(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/^(GMAIL|GOOGLECALENDAR|STRIPE|SLACK|NOTION)\s*/i, "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
