import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import { playerById, type PlayerId } from "@/app/_lib/demo/plays-demo-data";
import type { PlayRunRow } from "../types";
import type { PlayCardViewModel, PlayCardKind } from "./types";

/**
 * Map a database play_run row into the unified PlayCardViewModel.
 *
 * This is the canonical mapper for actual persisted plays (vs demo data).
 * All acting plays (prepared sends) and future records-type plays written
 * to play_runs should flow through here.
 */
export function mapPlayRunToCard(row: PlayRunRow): PlayCardViewModel {
  const playerSlug = resolvePlayerSlug(row);
  const player = playerById(playerSlug);
  const kind = resolveKind(row);

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
    sourceLabel: player.name,
    href: "/plays",
  };

  return {
    id: row.id,
    kind,
    playerSlug,
    playerName: row.player_name ?? player.name,
    playbookName: readMetadataString(row, "playbook_name"),
    subject: row.title,
    targetLabel: row.recipient_label ?? row.target_label,
    targetPrefix: kind === "acting" ? "To" : "For",
    preview: row.preview,
    confidence: row.confidence,
    ageMinutes,
    triggerLabel: readMetadataString(row, "trigger_label"),
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
            because: readMetadataString(row, "because"),
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
