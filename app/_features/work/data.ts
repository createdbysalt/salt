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
  service?: { id: string; name: string };
  relationship?: RelationshipType;
  tags: string[];
  lastActivityAt: string;
  source: SourceKind;
  signals: Signal[];
  contactCount: number;
};

export const WORK_ITEMS: WorkItem[] = [];

export function findWork(id: string): WorkItem | undefined {
  return WORK_ITEMS.find((work) => work.id === id);
}
