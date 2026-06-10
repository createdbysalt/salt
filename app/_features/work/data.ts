import {
  relativeDays,
  type RelationshipType,
  type Signal,
  type SourceKind,
} from "@/app/_lib/demo/people-demo-data";

export { relativeDays };

export type WorkStatus = "Active" | "Stalled" | "Wrapping" | "Renewing";

export type WorkItem = {
  id: string;
  title: string;
  status: WorkStatus;
  progress: number;
  org?: { id: string; name: string };
  relationship?: RelationshipType;
  tags: string[];
  lastActivityAt: string;
  source: SourceKind;
  signals: Signal[];
  contactCount: number;
};

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const WORK_ITEMS: WorkItem[] = [
  {
    id: "nw-brand",
    title: "Brand system refresh",
    status: "Active" as const,
    progress: 62,
    org: { id: "northwind", name: "Northwind Studio" },
    relationship: "Client" as const,
    tags: ["brand", "retainer", "design-led"],
    lastActivityAt: day(5),
    source: "salt_inferred" as const,
    signals: [
      { kind: "active_work" as const, label: "Active work" },
      { kind: "meeting_soon" as const, label: "Review in 3d" },
    ],
    contactCount: 2,
  },
  {
    id: "nw-site",
    title: "Marketing site relaunch",
    status: "Stalled" as const,
    progress: 28,
    org: { id: "northwind", name: "Northwind Studio" },
    relationship: "Client" as const,
    tags: ["brand", "web", "design-led"],
    lastActivityAt: day(11),
    source: "salt_inferred" as const,
    signals: [
      { kind: "quiet" as const, label: "Blocked 11d" },
      { kind: "payment_due" as const, label: "Invoice due" },
    ],
    contactCount: 2,
  },
  {
    id: "h-design",
    title: "Design ops retainer",
    status: "Renewing" as const,
    progress: 84,
    org: { id: "harbor", name: "Harbor & Co" },
    relationship: "Client" as const,
    tags: ["renewal", "retainer", "product"],
    lastActivityAt: day(6),
    source: "user" as const,
    signals: [{ kind: "renewal_risk" as const, label: "Renewal in 18d" }],
    contactCount: 2,
  },
  {
    id: "h-mobile",
    title: "Mobile redesign",
    status: "Active" as const,
    progress: 41,
    org: { id: "harbor", name: "Harbor & Co" },
    relationship: "Client" as const,
    tags: ["renewal", "product", "mobile"],
    lastActivityAt: day(3),
    source: "user" as const,
    signals: [{ kind: "active_work" as const, label: "Active work" }],
    contactCount: 2,
  },
].sort((a, b) => a.title.localeCompare(b.title));

export function findWork(id: string): WorkItem | undefined {
  return WORK_ITEMS.find((work) => work.id === id);
}
