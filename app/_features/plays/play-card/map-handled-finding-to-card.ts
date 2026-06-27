import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import {
  FINDING_TYPE_LABELS,
  type FindingWithContext,
} from "@/app/_features/capture/types/intelligence-findings";
import { playerById, type PlayerId } from "@/app/_lib/demo/plays-demo-data";
import {
  formatProfileFieldValue,
  keeperPlaybookDisplayName,
} from "@/app/_features/plays/playbooks/profile/keeper-profile-display";
import type { ProfileFieldKey } from "@/app/_features/plays/playbooks/profile/types";
import type { PlayCardViewModel } from "./types";

const FIELD_LABELS: Record<string, string> = {
  relationship_type: "relationship",
  title: "job title",
  org_link: "organization",
  website: "website",
  industry: "industry",
  relationship_status: "relationship status",
  key_contact: "key contact",
  status: "status",
  project_type: "project type",
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
  const isKeeper = readMetadataBool(finding, "keeper_profile");

  const changeLine =
    field && value
      ? `${FIELD_LABELS[field] ?? field.replace(/_/g, " ")} → ${formatProfileFieldValue(
          field as ProfileFieldKey,
          value,
        )}`
      : null;

  const playbookName = isKeeper
    ? keeperPlaybookDisplayName(blueprintSlug)
    : FINDING_TYPE_LABELS[finding.finding_type];

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
    kind: isKeeper ? "profile" : "risk",
    mode: "handled",
    playerSlug,
    playerName: player.name,
    playbookName,
    subject: finding.title,
    targetLabel,
    targetPrefix: "For",
    preview: finding.content,
    confidence: finding.confidence ?? null,
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
      isKeeper && field
        ? { field, proposedValue: value ?? "", because: finding.content }
        : undefined,
    risk: !isKeeper
      ? { signal: finding.content ?? finding.title, recommendation: "" }
      : undefined,
    primaryAction: null,
    canFlag: false,
    canSchedule: false,
    provenance: {
      source: "finding",
      findingId: finding.id,
      apply: isKeeper ? "keeper_profile" : "act",
      flagged: Boolean(finding.flagged_at),
    },
    askSalt,
  };
}

function getFindingPlayerId(finding: FindingWithContext): PlayerId {
  if (readMetadataBool(finding, "keeper_profile")) return "keeper";
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
