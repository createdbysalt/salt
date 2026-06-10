import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Users,
  type LucideIcon,
} from "lucide-react";

export type SpaceStatus = "kickoff" | "active" | "stalled" | "closed";
export type Visibility = "internal" | "team" | "client";

export const STATUS_META: Record<
  SpaceStatus,
  { label: string; tone: string; icon: LucideIcon }
> = {
  kickoff: { label: "Kickoff", tone: "bg-sky/15 text-sky", icon: Users },
  active: { label: "Active", tone: "bg-flame/15 text-flame", icon: CheckCircle2 },
  stalled: { label: "Stalled", tone: "bg-muted text-muted-foreground", icon: Clock },
  closed: { label: "Closed", tone: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

export const VISIBILITY_META: Record<Visibility, { label: string; icon: LucideIcon }> = {
  internal: { label: "Internal", icon: EyeOff },
  team: { label: "Team-visible", icon: Users },
  client: { label: "Client-visible", icon: Eye },
};

export type Space = {
  id: string;
  title: string;
  linked: { kind: "client" | "project" | "person"; label: string };
  owner: string;
  status: SpaceStatus;
  visibility: Visibility;
  roles: string[];
  worthAttention: string;
  lastActivity: string;
  pinned?: boolean;
};

export const SPACES: Space[] = [
  {
    id: "atlas-kickoff",
    title: "Atlas Coaching · New client kickoff",
    linked: { kind: "client", label: "Atlas Coaching" },
    owner: "You",
    status: "kickoff",
    visibility: "client",
    roles: ["Owner", "Team", "Client"],
    worthAttention: "Welcome sequence needs your approval before Friday's intro call.",
    lastActivity: "2h ago",
    pinned: true,
  },
  {
    id: "ridgeline-room",
    title: "Ridgeline · Active project room",
    linked: { kind: "project", label: "Ridgeline Q3 redesign" },
    owner: "You",
    status: "active",
    visibility: "team",
    roles: ["Owner", "Team", "Player"],
    worthAttention: "Two decisions blocked on Theo's review since Friday.",
    lastActivity: "yesterday",
    pinned: true,
  },
  {
    id: "northwind-relationship",
    title: "Northwind · Stalled relationship",
    linked: { kind: "client", label: "Northwind" },
    owner: "You",
    status: "stalled",
    visibility: "internal",
    roles: ["Owner", "Team"],
    worthAttention: "No outbound in 38 days. Salt drafted a re-open touch.",
    lastActivity: "38d ago",
  },
];

export function getSpace(id: string): Space | undefined {
  return SPACES.find((r) => r.id === id);
}
