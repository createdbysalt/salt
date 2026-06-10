import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { QueuePlayView } from "../types";

export function mapQueuePlayForUi(view: QueuePlayView): QueuePlay {
  return {
    id: view.id,
    playerId: view.playerId,
    state: "approval",
    source: view.source,
    ageMinutes: view.ageMin,
    recipient: view.recipient,
    channel: view.channel,
    subject: view.subject,
    summary: view.draftBody[0] ?? view.subject,
    draftBody: view.draftBody,
    reasoning: [],
    context: [],
    playbook: view.playbook,
  };
}
