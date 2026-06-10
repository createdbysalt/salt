import {
  AlertTriangle,
  FileSignature,
  FileText,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

export type PlayerId =
  | "follow-up"
  | "brief"
  | "client-risk"
  | "scope"
  | "billing";

export type Tone = "flame" | "sky" | "violet" | "muted" | "ink";

export type Player = {
  id: PlayerId;
  name: string;
  tone: Tone;
  icon: LucideIcon;
};

const PLAYERS: Player[] = [
  {
    id: "follow-up",
    name: "Follow-up",
    tone: "sky",
    icon: Users,
  },
  {
    id: "brief",
    name: "Brief",
    tone: "ink",
    icon: FileText,
  },
  {
    id: "client-risk",
    name: "Client Risk",
    tone: "flame",
    icon: AlertTriangle,
  },
  {
    id: "scope",
    name: "Scope",
    tone: "violet",
    icon: FileSignature,
  },
  {
    id: "billing",
    name: "Billing",
    tone: "flame",
    icon: Receipt,
  },
];

export const TONE_SOFT: Record<Tone, string> = {
  flame: "bg-flame/12 text-flame",
  sky: "bg-sky/15 text-sky",
  violet: "bg-violet/15 text-violet",
  muted: "bg-muted text-muted-foreground",
  ink: "bg-foreground/8 text-foreground",
};

export function playerById(id: PlayerId): Player {
  const player = PLAYERS.find((p) => p.id === id);
  if (!player) {
    throw new Error(`Unknown demo player: ${id}`);
  }
  return player;
}
