import type { MemoryWorkRow } from "@/app/_features/work/queries";
import type { WorkItem, WorkStatus } from "../data";

export function mapWorkStatus(status: string): WorkStatus {
  switch (status) {
    case "on_hold":
      return "Stalled";
    case "completed":
    case "archived":
      return "Wrapping";
    case "signed":
      return "Renewing";
    case "active":
    case "draft":
    default:
      return "Active";
  }
}

/** Map a projects row into the Memory Work directory table shape. */
export function toDirectoryWorkItem(row: MemoryWorkRow): WorkItem {
  return {
    id: row.id,
    title: row.name,
    status: mapWorkStatus(row.status),
    progress: 0,
    org: row.org ?? undefined,
    person: row.person ?? undefined,
    service: row.service ?? undefined,
    tags: [],
    lastActivityAt: row.updatedAt.toISOString(),
    source: "user",
    signals: [],
    contactCount: 0,
  };
}
