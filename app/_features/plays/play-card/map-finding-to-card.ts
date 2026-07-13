import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import {
  FINDING_TYPE_LABELS,
  type FindingType,
  type FindingWithContext,
} from "@/app/_features/capture/types/intelligence-findings";
import { playerById, type PlayerId } from "@/app/_lib/demo/plays-demo-data";
import {
  buildKeeperCardDisplay,
  keeperPlaybookDisplayName,
} from "@/app/_features/plays/playbooks/records-engine/keeper-profile-display";
import type {
  PlaybookSection,
  PlaybookOutputType,
} from "@/app/_features/plays/playbooks/schema/v2/types";
import type { PlayCardViewModel } from "./types";

/**
 * Derive v2 section from finding type.
 * Findings are interim signals — this maps them to the closest v2 section.
 */
function getSectionFromFindingType(type: FindingType): PlaybookSection {
  if (type.startsWith("revenue_")) return "billing";
  if (type.startsWith("pending_")) return "relationships";
  if (type === "new_person" || type === "new_org" || type === "needs_routing") {
    return "relationships";
  }
  if (type === "referral") return "relationships";
  return "_meta";
}

/**
 * Get section label for display.
 */
function getSectionLabel(section: PlaybookSection): string {
  const labels: Record<PlaybookSection, string> = {
    relationships: "Relationships",
    work: "Work",
    billing: "Billing",
    files: "Files",
    meetings: "Meetings",
    me: "Me",
    connections: "Connections",
    notes: "Notes",
    _meta: "System",
  };
  return labels[section];
}

/**
 * Derive v2 outputType from finding context.
 */
function getOutputTypeFromFinding(
  finding: FindingWithContext,
  isKeeperProfile: boolean
): PlaybookOutputType {
  if (isKeeperProfile) return "memory_update";
  if (finding.finding_type.startsWith("revenue_")) return "notification";
  if (finding.finding_type.startsWith("pending_")) return "notification";
  return "finding"; // Legacy, will be migrated to notification
}

/**
 * Interim adapter: render an intelligence finding as a play card view model.
 *
 * Findings are an internal scan signal; here we present them as plays (a
 * different body, same card) until they are written to `play_runs` directly.
 */
export function mapFindingToCard(finding: FindingWithContext): PlayCardViewModel {
  const playerSlug = getFindingPlayerId(finding);
  const player = playerById(playerSlug);
  const keeper = getKeeperProfileSuggestion(finding);
  const targetLabel =
    finding.person?.name ??
    finding.person?.email ??
    finding.org?.name ??
    null;

  const askSalt: AskSaltContext = {
    type: "play",
    id: finding.id,
    title: finding.title,
    recipientLabel: targetLabel ?? "this record",
    sourceLabel: readMetadataString(finding, "blueprint_name") ?? "Salt",
    href: "/plays",
  };

  const question = getQuestionPlay(finding);
  const section = getSectionFromFindingType(finding.finding_type);

  if (question) {
    return {
      id: finding.id,
      kind: "question",

      // V2 attribution (derived from finding)
      playbookSlug: readMetadataString(finding, "blueprint_slug"),
      playbookName: readMetadataString(finding, "blueprint_name") ?? "People Records",
      section,
      sectionLabel: getSectionLabel(section),
      layer: "learn",
      outputType: "memory_update",
      approvalMode: "per_entity",
      autoApplyThreshold: null,
      confidenceExplanation: null,
      valueEstimate: null,

      // Legacy attribution
      playerSlug,
      playerName: player.name,

      subject: finding.title,
      targetLabel,
      targetPrefix: "For",
      preview: finding.content,
      confidence: null,
      stakes: null,
      ageMinutes: null,
      triggerLabel: finding.evidence?.source_type === "email" ? "From email" : null,
      channel: "Memory",
      sourceUrl: finding.source_url ?? null,
      question: {
        field: question.field,
        prompt: finding.content ?? finding.title,
        options: question.options,
      },
      // Answered via the option chips (onAnswer), not a footer primary button.
      primaryAction: null,
      canFlag: false,
      canSchedule: false,
      provenance: {
        source: "finding",
        findingId: finding.id,
        apply: "keeper_profile",
        flagged: Boolean(finding.flagged_at),
      },
      askSalt,
    };
  }

  if (keeper) {
    const display = buildKeeperCardDisplay({
      findingTitle: finding.title,
      findingContent: finding.content,
      blueprintSlug: readMetadataString(finding, "blueprint_slug"),
      field: keeper.field,
      value: keeper.value,
      because: readMetadataString(finding, "because"),
      targetLabel,
    });

    return {
      id: finding.id,
      kind: "profile",

      // V2 attribution (derived from finding)
      playbookSlug: readMetadataString(finding, "blueprint_slug"),
      playbookName: display.playbookName,
      section,
      sectionLabel: getSectionLabel(section),
      layer: "learn",
      outputType: "memory_update",
      approvalMode: "per_entity",
      autoApplyThreshold: null,
      confidenceExplanation: readMetadataString(finding, "because"),
      valueEstimate: null,

      // Legacy attribution
      playerSlug,
      playerName: player.name,

      subject: display.title,
      targetLabel,
      targetPrefix: "For",
      preview: display.preview,
      confidence: finding.confidence ?? null,
      stakes: null,
      ageMinutes: null,
      triggerLabel: finding.evidence?.source_type === "email" ? "From email" : null,
      channel: "Memory",
      sourceUrl: finding.source_url ?? null,
      profile: {
        field: keeper.field,
        proposedValue: keeper.value ?? "",
        because: readMetadataString(finding, "because") ?? finding.content,
      },
      primaryAction: display.isActionable
        ? { label: display.primaryAction ?? "Save to Memory", kind: "apply_memory" }
        : null,
      canFlag: true,
      canSchedule: false,
      provenance: {
        source: "finding",
        findingId: finding.id,
        apply: "keeper_profile",
        flagged: Boolean(finding.flagged_at),
      },
      askSalt,
    };
  }

  // Non-Keeper finding: a scan signal presented as a risk-style play.
  const hasMemoryProposals =
    (finding.memory_proposals?.length ?? 0) > 0 && !finding.memory_applied_at;
  const preview = getRowPreview(finding);
  const outputType = getOutputTypeFromFinding(finding, false);

  return {
    id: finding.id,
    kind: "risk",

    // V2 attribution (derived from finding)
    playbookSlug: null, // Non-keeper findings don't have a playbook slug yet
    playbookName: FINDING_TYPE_LABELS[finding.finding_type],
    section,
    sectionLabel: getSectionLabel(section),
    layer: "learn",
    outputType,
    approvalMode: "per_entity",
    autoApplyThreshold: null,
    confidenceExplanation: null,
    valueEstimate: null,

    // Legacy attribution
    playerSlug,
    playerName: player.name,

    subject: finding.title,
    targetLabel,
    targetPrefix: targetLabel ? "For" : "From",
    preview,
    confidence: finding.confidence ?? null,
    stakes: null,
    ageMinutes: null,
    triggerLabel: finding.evidence?.source_type === "email" ? "From email" : null,
    channel: finding.evidence?.source_type === "stripe" ? "Stripe" : "Gmail",
    sourceUrl: finding.source_url ?? null,
    risk: {
      signal: preview ?? finding.content ?? finding.title,
      recommendation: getActionLabel(finding.finding_type),
    },
    primaryAction: {
      label: hasMemoryProposals ? "Apply to Memory" : getActionLabel(finding.finding_type),
      kind: hasMemoryProposals ? "apply_memory" : "act",
    },
    canFlag: true,
    canSchedule: false,
    provenance: {
      source: "finding",
      findingId: finding.id,
      apply: hasMemoryProposals ? "memory_plan" : "act",
      flagged: Boolean(finding.flagged_at),
    },
    askSalt,
  };
}

function getFindingPlayerId(finding: FindingWithContext): PlayerId {
  const metadata = finding.evidence?.metadata;
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    (metadata as Record<string, unknown>).keeper_profile === true
  ) {
    return "keeper";
  }
  if (finding.finding_type.startsWith("revenue_")) return "client-risk";
  if (finding.finding_type.startsWith("pending_")) return "follow-up";
  if (
    finding.finding_type === "needs_routing" ||
    finding.finding_type === "new_person" ||
    finding.finding_type === "new_org"
  ) {
    return "keeper";
  }
  return "brief";
}

type KeeperProfileSuggestion = { field: string; value: string | null };

function getKeeperProfileSuggestion(
  finding: FindingWithContext,
): KeeperProfileSuggestion | null {
  const metadata = finding.evidence?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  if (record.keeper_profile !== true) return null;
  const field = typeof record.profile_field === "string" ? record.profile_field : null;
  if (!field) return null;
  return {
    field,
    value: typeof record.profile_value === "string" ? record.profile_value : null,
  };
}

type QuestionPlay = {
  field: string;
  options: Array<{ value: string; label: string }>;
};

function getQuestionPlay(finding: FindingWithContext): QuestionPlay | null {
  const metadata = finding.evidence?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  if (record.keeper_question !== true) return null;
  const field = typeof record.question_field === "string" ? record.question_field : null;
  if (!field) return null;
  const rawOptions = Array.isArray(record.question_options) ? record.question_options : [];
  const options = rawOptions
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const value = (option as Record<string, unknown>).value;
      const label = (option as Record<string, unknown>).label;
      if (typeof value !== "string" || typeof label !== "string") return null;
      return { value, label };
    })
    .filter((option): option is { value: string; label: string } => option !== null);
  if (options.length === 0) return null;
  return { field, options };
}

function getRowPreview(finding: FindingWithContext): string | null {
  const because = readMetadataString(finding, "because");
  const quote = finding.evidence?.quotes?.[0]?.trim();
  if (because && because !== finding.content) return because;
  if (quote && !finding.content?.includes(quote)) return quote;
  if (finding.content) {
    const trimmed = finding.content.trim();
    const separator = trimmed.indexOf(". ");
    if (separator === -1) return trimmed;
    return trimmed.slice(separator + 2).trim() || trimmed;
  }
  return null;
}

function readMetadataString(finding: FindingWithContext, key: string): string | null {
  const metadata = finding.evidence?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getActionLabel(type: FindingType): string {
  switch (type) {
    case "revenue_buying":
    case "revenue_closing":
      return "Follow up";
    case "revenue_upsell":
      return "Explore";
    case "revenue_risk":
      return "Address";
    case "new_person":
    case "new_org":
    case "needs_routing":
      return "Choose profile";
    case "referral":
      return "Reach out";
    case "pending_question":
    case "pending_deliverable":
    case "pending_reply":
      return "Reply";
    default:
      return "Act";
  }
}
