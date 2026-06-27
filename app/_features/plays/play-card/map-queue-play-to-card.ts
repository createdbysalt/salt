import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import { playerById, type QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { PlayCardViewModel } from "./types";

/**
 * Map a prepared play (QueuePlay, backed by `play_runs`) into the unified card.
 * These are `acting` plays: an editable draft the user approves and sends.
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
    playerSlug: play.playerId,
    playerName: player.name,
    playbookName: play.playbook ?? null,
    subject: play.subject,
    targetLabel: play.recipient,
    targetPrefix: "To",
    preview: play.summary,
    confidence: typeof play.confidence === "number" ? play.confidence : null,
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
