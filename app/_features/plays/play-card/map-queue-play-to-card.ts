import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import { playerById, type QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { PlayCardViewModel } from "./types";

/**
 * Map a prepared play (QueuePlay, backed by `play_runs`) into the unified card.
 * These are `acting` plays: an editable draft the user approves and sends.
 *
 * Note: QueuePlay is demo/mock data — it doesn't have v2 playbook info.
 * V2 fields are set to null; real play_runs use mapPlayRunToCard which does v2 lookup.
 */
export function mapQueuePlayToCard(play: QueuePlay): PlayCardViewModel {
  const player = playerById(play.playerId);

  const askSalt: AskSaltContext = {
    type: "play",
    id: play.id,
    title: play.subject,
    recipientLabel: play.recipient,
    sourceLabel: play.source,
    href: "/plays",
  };

  return {
    id: play.id,
    kind: "acting",

    // V2 attribution (not available for demo QueuePlay)
    playbookSlug: null,
    playbookName: play.playbook ?? null,
    section: null,
    sectionLabel: null,
    layer: "act",
    outputType: "email_draft",
    approvalMode: "per_entity",
    autoApplyThreshold: null,
    confidenceExplanation: null,
    valueEstimate: null,

    // Legacy attribution
    playerSlug: play.playerId,
    playerName: player.name,

    subject: play.subject,
    targetLabel: play.recipient,
    targetPrefix: "To",
    preview: play.summary,
    confidence: typeof play.confidence === "number" ? play.confidence : null,
    stakes: null,
    ageMinutes: play.ageMinutes,
    triggerLabel: play.source,
    channel: play.channel,
    acting: {
      draftBody: play.draftBody,
      recipientLabel: play.recipient,
    },
    primaryAction: { label: "Approve & send", kind: "approve_send" },
    canFlag: false,
    canSchedule: true,
    provenance: { source: "play_run", playRunId: play.id },
    askSalt,
  };
}
