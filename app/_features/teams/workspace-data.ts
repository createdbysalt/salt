// Salt workspace team — collaborators with access to your studio, not client contacts.

export type WorkspaceRole = "Owner" | "Operator" | "Counsel" | "Finance";
export type AccessStatus = "active" | "invited" | "away";

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  title: string;
  workspaceRole: WorkspaceRole;
  access: AccessStatus;
  owns: string[];
  playsRouted: number;
  lastActiveAt: string;
  email?: string;
  /** Link to People record when this teammate also exists in Memory */
  personId?: string;
  /** Owner row links to /me instead of a person detail */
  isOwner?: boolean;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "owner",
    name: "Nikita Ostrovsky",
    initials: "NO",
    title: "Founder & operator",
    workspaceRole: "Owner",
    access: "active",
    owns: ["All accounts", "Play approval", "Spaces"],
    playsRouted: 0,
    lastActiveAt: day(0),
    email: "nikita@withsalt.ai",
    isOwner: true,
  },
  {
    id: "elena-rossi",
    name: "Elena Rossi",
    initials: "ER",
    title: "Studio Director",
    workspaceRole: "Operator",
    access: "active",
    owns: ["Staffing", "Capacity", "Internal ops"],
    playsRouted: 0,
    lastActiveAt: day(0),
    email: "elena@salt.studio",
    personId: "elena-rossi",
  },
  {
    id: "dev-patel",
    name: "Dev Patel",
    initials: "DP",
    title: "Finance lead",
    workspaceRole: "Finance",
    access: "active",
    owns: ["Renewals", "Billing plays", "Invoices"],
    playsRouted: 1,
    lastActiveAt: day(-1),
    email: "dev@salt.studio",
  },
  {
    id: "ari-mendez",
    name: "Ari Mendez",
    initials: "AM",
    title: "Counsel",
    workspaceRole: "Counsel",
    access: "active",
    owns: ["Contracts", "SOW redlines", "Scope reviews"],
    playsRouted: 0,
    lastActiveAt: day(-1),
    email: "ari@salt.studio",
  },
];

export const PENDING_INVITE: TeamMember = {
  id: "pending-ea",
  name: "Jordan Reeves",
  initials: "JR",
  title: "Executive assistant",
  workspaceRole: "Operator",
  access: "invited",
  owns: ["Capture review", "Scheduling"],
  playsRouted: 0,
  lastActiveAt: day(-3),
  email: "jordan@salt.studio",
};

export const ALL_TEAM = [...TEAM_MEMBERS, PENDING_INVITE];

export const WORKSPACE_ROLE_META: Record<
  WorkspaceRole,
  { label: string; tone: string }
> = {
  Owner: { label: "Owner", tone: "bg-foreground/10 text-foreground border-border/60" },
  Operator: { label: "Operator", tone: "bg-sky/15 text-sky border-sky/30" },
  Counsel: { label: "Counsel", tone: "bg-violet/15 text-violet border-violet/30" },
  Finance: { label: "Finance", tone: "bg-flame/15 text-flame border-flame/30" },
};

export const ACCESS_META: Record<
  AccessStatus,
  { label: string; tone: string }
> = {
  active: { label: "Active", tone: "bg-muted text-foreground/80" },
  invited: { label: "Invited", tone: "bg-sky/10 text-sky border border-sky/25" },
  away: { label: "Away", tone: "bg-muted/60 text-muted-foreground" },
};

export function relativeActive(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
