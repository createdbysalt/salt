/**
 * Client-safe Play Run to Card mapper.
 *
 * Unlike map-play-run-to-card.ts, this version does NOT use filesystem-based
 * playbook resolution (getPlaybookBySlug). It derives v2 metadata from the
 * row's source_context and metadata fields only.
 *
 * Use this in client components. The server-side mapper provides richer
 * playbook resolution when available.
 */

import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import {
  SECTION_METADATA,
  type PlaybookSection,
  type PlaybookOutputType,
  type PlaybookLayer,
  type PlaybookApprovalMode,
} from "../playbooks/schema/v2/types";
import type { PlayRunRow } from "../types";
import type { PlayCardViewModel, PlayCardKind, PlayCardErrorState, PlayArtifact } from "./types";
import { buildPlayHeadline, summarizeEvidence, type PlayEvidenceItem } from "../lib/play-headline";

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
  notFound?: boolean;
}

/**
 * Client-safe v2 resolution from row metadata only.
 * Does NOT read filesystem - uses embedded metadata.
 */
function resolveV2PlaybookFromMetadata(row: PlayRunRow): V2Resolution | null {
  const playbookSlug = row.source_context?.playbook_slug;
  if (!playbookSlug) return null;

  const meta = row.metadata as Record<string, unknown> | null;

  // Prefer persisted section metadata, then fall back to the slug pattern.
  let section: PlaybookSection = "work";
  if (typeof meta?.section === "string" && isPlaybookSection(meta.section)) {
    section = meta.section;
  } else if (playbookSlug.includes("person") || playbookSlug.includes("org") || playbookSlug.includes("relationship")) {
    section = "relationships";
  } else if (playbookSlug.includes("work") || playbookSlug.includes("project")) {
    section = "work";
  } else if (playbookSlug.includes("billing") || playbookSlug.includes("invoice") || playbookSlug.includes("payment")) {
    section = "billing";
  } else if (playbookSlug.includes("meeting") || playbookSlug.includes("calendar")) {
    section = "meetings";
  } else if (playbookSlug.includes("file")) {
    section = "files";
  } else if (playbookSlug.includes("email") || playbookSlug.includes("triage") || playbookSlug.includes("communication")) {
    section = "communication";
  }

  const sectionMeta = SECTION_METADATA[section];

  return {
    playbookSlug,
    playbookName: (meta?.playbook_name as string) ?? formatSlugAsName(playbookSlug),
    section,
    sectionLabel: sectionMeta?.name ?? section,
    layer: (meta?.layer as PlaybookLayer) ?? "learn",
    outputType: (meta?.output_type as PlaybookOutputType) ?? "memory_update",
    approvalMode: "ask",
    autoApplyThreshold: null,
    confidenceExplanation: null,
    valueEstimate: null,
  };
}

function isPlaybookSection(value: string): value is PlaybookSection {
  return value in SECTION_METADATA;
}

function formatSlugAsName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function detectErrors(row: PlayRunRow, v2: V2Resolution | null): PlayCardErrorState | undefined {
  const errors: PlayCardErrorState = {};
  let hasErrors = false;

  if (v2?.notFound) {
    errors.playbookNotFound = true;
    errors.message = "Playbook unavailable";
    hasErrors = true;
  }

  const isEmailDraft = v2?.outputType === "email_draft" || Boolean(row.draft_body);
  if (isEmailDraft && !row.draft_body?.trim()) {
    errors.draftIncomplete = true;
    if (!errors.message) errors.message = "Draft incomplete";
    hasErrors = true;
  }

  return hasErrors ? errors : undefined;
}

function kindFromOutputType(outputType: PlaybookOutputType): PlayCardKind {
  switch (outputType) {
    case "email_draft":
      return "acting";
    case "memory_update":
      return "profile";
    case "notification":
    case "finding":
    case "briefing":
      return "risk";
    default:
      return "risk";
  }
}

/**
 * Client-safe mapper for PlayRunRow → PlayCardViewModel.
 *
 * Does NOT use filesystem-based playbook resolution. Safe for use in
 * client components (PlaysPage.tsx, etc.).
 */
export function mapPlayRunToCardClient(row: PlayRunRow): PlayCardViewModel {
  const v2 = resolveV2PlaybookFromMetadata(row);
  const error = detectErrors(row, v2);

  // Legacy attribution (deprecated) — pass-through, no demo-player fallback
  const playerSlug = row.player_slug ?? null;
  const kind = v2 ? kindFromOutputType(v2.outputType) : resolveKind(row);

  const ageMinutes = Math.round(
    (Date.now() - new Date(row.created_at).getTime()) / 60_000
  );

  const draftBody = row.draft_body
    ? row.draft_body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const askSalt: AskSaltContext = {
    type: "play",
    id: row.id,
    title: row.title,
    recipientLabel: row.recipient_label ?? row.target_label ?? "this record",
    sourceLabel: v2?.sectionLabel ?? row.player_name ?? "Salt",
    href: "/plays",
  };

  const stepPosition = readStepPosition(row);
  const sourceAppLabel = channelAppLabel(row.channel, readMetadataString(row, "source_url"));

  return {
    id: row.id,
    kind,

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

    playerSlug,
    playerName: row.player_name ?? null,

    subject: row.title,
    headline: buildPlayHeadline({
      headline: readMetadataString(row, "headline"),
      subject: row.title,
      targetLabel: row.recipient_label ?? row.target_label,
      outputType: v2?.outputType ?? null,
    }),
    targetLabel: row.recipient_label ?? row.target_label,
    targetPrefix: kind === "acting" ? "To" : "For",
    preview: row.paused_for_approval && row.approval_context
      ? `Waiting for approval: ${formatToolSlug(row.approval_context.tool_slug)}`
      : row.preview,
    confidence: row.confidence,
    stakes: (row.stakes as "low" | "medium" | "high" | null) ?? null,
    ageMinutes,
    triggerLabel: v2 ? row.source_context?.trigger_signal ?? null : readMetadataString(row, "trigger_label"),
    channel: row.channel,
    sourceUrl: readMetadataString(row, "source_url"),
    stepPosition,
    artifacts: readArtifacts(row),
    evidence: summarizeEvidence({
      triggerLabel: v2 ? row.source_context?.trigger_signal ?? null : readMetadataString(row, "trigger_label"),
      sourceUrl: readMetadataString(row, "source_url"),
      sourceAppLabel: sourceAppLabel,
      confidenceExplanation: v2?.confidenceExplanation ?? null,
      entries: readEvidenceEntries(row),
    }),

    acting:
      kind === "acting"
        ? {
            draftBody,
            recipientLabel: row.recipient_label ?? row.target_label ?? "",
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
    error,
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

/** Per-app prepared artifacts, from metadata.artifacts (executor-written). */
function readArtifacts(row: PlayRunRow): PlayArtifact[] | null {
  const meta = row.metadata as Record<string, unknown> | null;
  const raw = meta?.artifacts;
  if (!Array.isArray(raw)) return null;
  const items = raw.filter(
    (a): a is PlayArtifact =>
      !!a &&
      typeof a === "object" &&
      typeof (a as PlayArtifact).appId === "string" &&
      typeof (a as PlayArtifact).label === "string",
  );
  return items.length ? items : null;
}

/** Reasoning-chain entries, from metadata.evidence (executor-written). */
function readEvidenceEntries(row: PlayRunRow): PlayEvidenceItem[] | undefined {
  const meta = row.metadata as Record<string, unknown> | null;
  const raw = meta?.evidence;
  if (!Array.isArray(raw)) return undefined;
  const items = raw.filter(
    (e): e is PlayEvidenceItem =>
      !!e && typeof e === "object" && typeof (e as PlayEvidenceItem).label === "string",
  );
  return items.length ? items : undefined;
}

/** "Step N of M" for the card face, from step_history + approval_context. */
function readStepPosition(
  row: PlayRunRow,
): { current: number; total: number | null; label: string | null } | null {
  const meta = row.metadata as Record<string, unknown> | null;
  const history = Array.isArray(meta?.step_history) ? meta!.step_history.length : 0;
  const totalRaw = meta?.total_steps;
  const total = typeof totalRaw === "number" && totalRaw > 0 ? totalRaw : null;

  const approvalIndex = row.approval_context?.step_index;
  const current =
    typeof approvalIndex === "number"
      ? approvalIndex + 1
      : history > 0
        ? history + 1
        : // Queued run waiting at its first gate — step 1 by definition.
          total != null
          ? 1
          : null;

  if (current == null) return null;
  const label =
    (typeof row.approval_context?.tool_slug === "string" &&
      formatToolSlug(row.approval_context.tool_slug)) ||
    null;
  return { current, total, label };
}

function channelAppLabel(
  channel: string | null,
  sourceUrl: string | null,
): string | null {
  const host = (() => {
    if (!sourceUrl) return "";
    try {
      return new URL(sourceUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.includes("mail.google") || host.includes("gmail")) return "Gmail";
  if (host.includes("stripe")) return "Stripe";
  if (host.includes("calendar.google")) return "Google Calendar";
  if (channel === "Gmail" || channel === "Email") return "Gmail";
  if (channel === "Stripe") return "Stripe";
  return channel;
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
