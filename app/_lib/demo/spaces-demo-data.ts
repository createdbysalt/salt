import {
  CheckCircle2,
  Clock,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Person } from "./people-demo-data";
import type { Org } from "./orgs-demo-data";

export type SpaceStatus = "kickoff" | "active" | "stalled" | "closed";

export const STATUS_META: Record<
  SpaceStatus,
  { label: string; tone: string; icon: LucideIcon }
> = {
  kickoff: { label: "Kickoff", tone: "bg-sky/15 text-sky", icon: Users },
  active: { label: "Active", tone: "bg-flame/15 text-flame", icon: CheckCircle2 },
  stalled: { label: "Stalled", tone: "bg-muted text-muted-foreground", icon: Clock },
  closed: { label: "Closed", tone: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

export type Space = {
  id: string;
  title: string;
  linked: { kind: "client" | "project" | "person"; label: string };
  owner: string;
  status: SpaceStatus;
  worthAttention: string;
};

export const SPACES: Space[] = [
  {
    id: "northwind-relationship",
    title: "Northwind · Stalled relationship",
    linked: { kind: "client", label: "Northwind" },
    owner: "You",
    status: "stalled",
    worthAttention: "No outbound in 38 days. Salt drafted a re-open touch.",
  },
  {
    id: "harbor-renewal",
    title: "Harbor & Co · Renewal room",
    linked: { kind: "client", label: "Harbor & Co" },
    owner: "You",
    status: "active",
    worthAttention: "Renewal in 18 days — two scope questions still open from QBR.",
  },
];

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function labelsMatch(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const leftToken = left.split(/\s+/)[0];
  const rightToken = right.split(/\s+/)[0];
  return (
    leftToken.length > 2 &&
    rightToken.length > 2 &&
    (leftToken === rightToken || left.includes(rightToken) || right.includes(leftToken))
  );
}

function matchesOrgName(item: Space, orgName: string) {
  if (labelsMatch(item.linked.label, orgName)) return true;
  if (normalize(item.title).includes(normalize(orgName.split(/\s+/)[0]))) return true;
  return false;
}

function matchesPersonSpace(item: Space, person: Person) {
  if (item.linked.kind === "person" && labelsMatch(item.linked.label, person.name)) {
    return true;
  }
  if (normalize(item.title).includes(normalize(person.name))) return true;
  if (person.org && matchesOrgName(item, person.org.name)) return true;
  return false;
}

export function spacesForPerson(person: Person): Space[] {
  return SPACES.filter((item) => matchesPersonSpace(item, person));
}

export function spacesForOrg(org: Org): Space[] {
  return SPACES.filter((item) => matchesOrgName(item, org.name));
}
