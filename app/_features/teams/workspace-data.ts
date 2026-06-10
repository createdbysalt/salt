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

export const TEAM_MEMBERS: TeamMember[] = [];

export const ALL_TEAM: TeamMember[] = [];

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
