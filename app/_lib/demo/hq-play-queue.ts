import {
  Brain,
  FileSignature,
  FileText,
  Receipt,
  Users,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { IconType } from "react-icons";
import { SiGmail, SiNotion, SiSlack, SiStripe } from "react-icons/si";

export type HqQueuePlayerId =
  | "follow-up"
  | "brief"
  | "client-risk"
  | "scope"
  | "billing";
export type HqQueueChannel = "Gmail" | "Slack" | "Notion" | "Memory" | "Stripe";
export type HqQueueTone = "flame" | "sky" | "violet" | "muted" | "ink";

export type HqQueuePlay = {
  id: string;
  playerId: HqQueuePlayerId;
  playbook: string;
  title: string;
  preview: string;
  recipient: string;
  channel: HqQueueChannel;
  channels?: HqQueueChannel[];
  eta: string;
  confidence: number;
};

export type HqQueuePlayer = {
  id: HqQueuePlayerId;
  name: string;
  tone: HqQueueTone;
  icon: LucideIcon;
};

export const HQ_PLAYS_RAN_TODAY = 3;
export const HQ_PLAYS_AWAITING_COPY = 3;

export const HQ_QUEUE_CHANNEL: Record<
  HqQueueChannel,
  { Icon: IconType | typeof Brain; color: string; label: string }
> = {
  Gmail: { Icon: SiGmail, color: "#EA4335", label: "Gmail" },
  Slack: { Icon: SiSlack, color: "#4A154B", label: "Slack" },
  Notion: { Icon: SiNotion, color: "currentColor", label: "Notion" },
  Memory: { Icon: Brain, color: "#6B7280", label: "Memory" },
  Stripe: { Icon: SiStripe, color: "#635BFF", label: "Stripe" },
};

export const HQ_QUEUE_TONE_SOFT: Record<HqQueueTone, string> = {
  flame: "bg-flame/12 text-flame",
  sky: "bg-sky/15 text-sky",
  violet: "bg-violet/15 text-violet",
  muted: "bg-muted text-muted-foreground",
  ink: "bg-foreground/8 text-foreground",
};

const HQ_QUEUE_PLAYERS: HqQueuePlayer[] = [
  { id: "follow-up", name: "Follow-up", tone: "sky", icon: Users },
  { id: "brief", name: "Brief", tone: "ink", icon: FileText },
  { id: "client-risk", name: "Client Risk", tone: "flame", icon: AlertTriangle },
  { id: "scope", name: "Scope", tone: "violet", icon: FileSignature },
  { id: "billing", name: "Billing", tone: "flame", icon: Receipt },
];

export function getHqQueuePlayer(id: HqQueuePlayerId): HqQueuePlayer {
  const player = HQ_QUEUE_PLAYERS.find((entry) => entry.id === id);
  if (!player) {
    throw new Error(`Unknown HQ queue player: ${id}`);
  }
  return player;
}

/** Prototype-aligned approval queue items (salt-prototype / landing2 demo). */
export const MOCK_HQ_PLAY_QUEUE: HqQueuePlay[] = [
  {
    id: "1",
    playerId: "billing",
    playbook: "Invoice nudge",
    title: "Send payment reminder to Brightline Legal",
    preview:
      "Hi Marcus, just a gentle nudge on invoice #2026-05-018 for $4,200, due today. Happy to hop on a quick call if it's easier...",
    recipient: "Marcus Hale · Brightline Legal",
    channel: "Gmail",
    eta: "12s to send",
    confidence: 96,
  },
  {
    id: "2",
    playerId: "follow-up",
    playbook: "Check-in",
    title: "Send kickoff recap to Cedar Studio",
    preview:
      "Quick recap of yesterday's scope call — next steps, timeline, and the add-on structure Ari asked about...",
    recipient: "Ari Chen · Cedar Studio",
    channel: "Gmail",
    eta: "8s to send",
    confidence: 94,
  },
  {
    id: "3",
    playerId: "scope",
    playbook: "Scope drift",
    title: "Reply to Cedar's scope request",
    preview:
      "Two extra landing pages would be a separate engagement. Drafted a $3,800 add-on with a 10-day timeline...",
    recipient: "Ari Chen · Cedar Studio",
    channel: "Gmail",
    channels: ["Stripe", "Gmail"],
    eta: "30s to review",
    confidence: 92,
  },
  {
    id: "4",
    playerId: "brief",
    playbook: "Project kickoff",
    title: "Prep brief for Atlas Coaching kickoff",
    preview:
      "One-pager ready: discovery summary, three risks, recommended agenda. Theo signed last week's contract, opening with the goals he flagged...",
    recipient: "Theo Grant · Atlas Coaching",
    channel: "Notion",
    eta: "45s to read",
    confidence: 89,
  },
];
