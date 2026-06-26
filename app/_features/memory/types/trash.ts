export type MemoryEntityType = "person" | "org" | "work" | "note";

export const TRASH_RETENTION_DAYS = 30;

export interface MemoryTrashItem {
  entityType: MemoryEntityType;
  id: string;
  label: string;
  sublabel?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedByName?: string | null;
  /** ISO timestamp when trash item will be permanently deleted */
  purgeAt?: string | null;
}

export function computePurgeAt(deletedAt: string): string {
  const purge = new Date(deletedAt);
  purge.setUTCDate(purge.getUTCDate() + TRASH_RETENTION_DAYS);
  return purge.toISOString();
}

export function daysUntilPurge(deletedAt: string, now = new Date()): number {
  const purge = new Date(computePurgeAt(deletedAt));
  const diffMs = purge.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export const MEMORY_ENTITY_LABELS: Record<MemoryEntityType, string> = {
  person: "Person",
  org: "Org",
  work: "Work",
  note: "Note",
};

const MEMORY_ENTITY_TYPES = new Set<MemoryEntityType>(["person", "org", "work", "note"]);

export function isMemoryEntityType(value: string | undefined): value is MemoryEntityType {
  return value !== undefined && MEMORY_ENTITY_TYPES.has(value as MemoryEntityType);
}
