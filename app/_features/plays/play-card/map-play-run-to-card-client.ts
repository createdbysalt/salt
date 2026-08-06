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
import { playerById, type PlayerId } from "@/app/_lib/demo/plays-demo-data";
import {
  SECTION_METADATA,
  type PlaybookSection,
  type PlaybookOutputType,
  type PlaybookLayer,
  type PlaybookApprovalMode,
} from "../playbooks/schema/v2/types";
import type { PlayRunRow } from "../types";
import type { PlayCardViewModel, PlayCardKind, PlayCardErrorState } from "./types";

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

  // Prefer persisted section metadata for generic system playbooks like
  // memory-records, then fall back to the slug pattern.
  let section: PlaybookSection = "_meta";
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
    approvalMode: "per_entity",
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

  const playerSlug = resolvePlayerSlug(row);
  const player = playerById(playerSlug);
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
    sourceLabel: v2?.sectionLabel ?? player.name,
    href: "/plays",
  };

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
    playerName: row.player_name ?? player.name,

    subject: row.title,
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

function resolvePlayerSlug(row: PlayRunRow): PlayerId {
  if (row.player_slug && isValidPlayerSlug(row.player_slug)) {
    return row.player_slug;
  }
  const meta = row.metadata;
  if (meta && typeof meta === "object" && typeof meta.player_slug === "string") {
    if (isValidPlayerSlug(meta.player_slug)) return meta.player_slug;
  }
  return "brief";
}

function isValidPlayerSlug(slug: string): slug is PlayerId {
  return ["follow-up", "brief", "client-risk", "scope", "billing", "keeper"].includes(slug);
}

function resolveKind(row: PlayRunRow): PlayCardKind {
  const meta = row.metadata;
  if (meta && typeof meta === "object") {
    if (meta.play_card_kind && typeof meta.play_card_kind === "string") {
      if (isValidKind(meta.play_card_kind)) return meta.play_card_kind;
    }
    if (meta.keeper_question === true) return "question";
    if (meta.keeper_profile === true) return "profile";
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
