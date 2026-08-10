import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import {
  FINDING_TYPE_LABELS,
  type FindingType,
  type FindingWithContext,
} from "@/app/_features/capture/types/intelligence-findings";
import { playerById, type PlayerId } from "@/app/_lib/demo/plays-demo-data";
import {
  formatProfileFieldValue,
  memoryCarePlaybookDisplayName,
} from "@/app/_features/plays/playbooks/records-engine/memory-care-display";
import type { ProfileFieldKey } from "@/app/_features/plays/playbooks/records-engine/types";
import type { PlaybookSection } from "@/app/_features/plays/playbooks/schema/v2/types";
import type { PlayCardViewModel } from "./types";

/**
 * Derive v2 section from finding type.
 */
function getSectionFromFindingType(type: FindingType): PlaybookSection {
  if (type.startsWith("revenue_")) return "billing";
  if (type.startsWith("pending_")) return "relationships";
  if (type === "new_person" || type === "new_org" || type === "needs_routing") {
    return "relationships";
  }
  if (type === "referral") return "relationships";
  return "work";
}

/**
 * Get section label for display.
 */
function getSectionLabel(section: PlaybookSection): string {
  const labels: Record<PlaybookSection, string> = {
    relationships: "Relationships",
    work: "Work",
    billing: "Billing",
    resources: "Resources",
    meetings: "Meetings",
    me: "Me",
    connections: "Connections",
    notes: "Notes",
    communication: "Communication",
  };
  return labels[section];
}

const FIELD_LABELS: Record<string, string> = {
  relationship_type: "relationship",
  title: "job title",
  org_link: "organization",
  website: "website",
  industry: "industry",
  relationship_status: "relationship status",
  key_contact: "key contact",
  status: "status",
  description: "description",
  deadline: "deadline",
  start_date: "start date",
};

/**
 * Map an already-applied (auto_handled) finding into a handled play card.
 * The card is read-mostly: it shows what Salt did, with Undo + Correct.
 */
export function mapHandledFindingToCard(finding: FindingWithContext): PlayCardViewModel {
  const playerSlug = getFindingPlayerId(finding);
  const player = playerById(playerSlug);
  const targetLabel =
    finding.person?.name ?? finding.person?.email ?? finding.org?.name ?? "Memory";

  const field = readMetadataString(finding, "profile_field");
  const value = readMetadataString(finding, "profile_value");
  const blueprintSlug = readMetadataString(finding, "blueprint_slug");
  const isMemoryCare = isMemoryCareProfileFinding(finding);

  const changeLine =
    field && value
      ? `${FIELD_LABELS[field] ?? field.replace(/_/g, " ")} → ${formatProfileFieldValue(
          field as ProfileFieldKey,
          value,
        )}`
      : null;

  const playbookName = isMemoryCare
    ? memoryCarePlaybookDisplayName(blueprintSlug)
    : FINDING_TYPE_LABELS[finding.finding_type];

  const section = getSectionFromFindingType(finding.finding_type);

  const askSalt: AskSaltContext = {
    type: "play",
    id: finding.id,
    title: finding.title,
    recipientLabel: targetLabel,
    sourceLabel: playbookName,
    href: "/plays?filter=auto_handled",
  };

  return {
    id: finding.id,
    kind: isMemoryCare ? "profile" : "risk",
    mode: "handled",

    // V2 attribution (derived from finding)
    playbookSlug: blueprintSlug,
    playbookName,
    section,
    sectionLabel: getSectionLabel(section),
    layer: "learn",
    outputType: isMemoryCare ? "memory_update" : "notification",
    approvalMode: "auto", // Auto-handled = no approval needed
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
    confidence: finding.confidence ?? null,
    stakes: null,
    ageMinutes: null,
    triggerLabel: null,
    channel: null,
    sourceUrl: finding.source_url ?? null,
    handled: {
      outcomeLabel: finding.title,
      changeLine,
      handledAt: finding.created_at,
    },
    // Body fields kept for parity but the handled variant renders changeLine.
    profile:
      isMemoryCare && field
        ? { field, proposedValue: value ?? "", because: finding.content }
        : undefined,
    risk: !isMemoryCare
      ? { signal: finding.content ?? finding.title, recommendation: "" }
      : undefined,
    primaryAction: null,
    canFlag: false,
    canSchedule: false,
    provenance: {
      source: "finding",
      findingId: finding.id,
      apply: isMemoryCare ? "memory_care" : "act",
      flagged: Boolean(finding.flagged_at),
    },
    askSalt,
  };
}

function getFindingPlayerId(finding: FindingWithContext): PlayerId {
  if (isMemoryCareProfileFinding(finding)) return "memory-care";
  if (finding.finding_type.startsWith("revenue_")) return "client-risk";
  if (finding.finding_type.startsWith("pending_")) return "follow-up";
  if (
    finding.finding_type === "needs_routing" ||
    finding.finding_type === "new_person" ||
    finding.finding_type === "new_org"
  ) {
    return "memory-care";
  }
  return "brief";
}

/** Accepts the current key plus the retired `keeper_profile` metadata key. */
function isMemoryCareProfileFinding(finding: FindingWithContext): boolean {
  return (
    readMetadataBool(finding, "memory_care_profile") ||
    readMetadataBool(finding, "keeper_profile")
  );
}

function readMetadataString(finding: FindingWithContext, key: string): string | null {
  const metadata = finding.evidence?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readMetadataBool(finding: FindingWithContext, key: string): boolean {
  const metadata = finding.evidence?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>)[key] === true;
}
