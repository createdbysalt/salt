import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  computePurgeAt,
  type TrashEntityType,
  type MemoryTrashItem,
} from "../types/trash";

interface EntityQueryConfig {
  entityType: TrashEntityType;
  table: string;
  tenantColumn: "workspace_id" | "workspace_id";
  labelColumns: string[];
  sublabelColumn?: string;
}

const ENTITY_QUERIES: EntityQueryConfig[] = [
  {
    entityType: "person",
    table: "people",
    tenantColumn: "workspace_id",
    labelColumns: ["name"],
    sublabelColumn: "email",
  },
  {
    entityType: "org",
    table: "organizations",
    tenantColumn: "workspace_id",
    labelColumns: ["name"],
    sublabelColumn: "domain",
  },
  {
    entityType: "work",
    table: "work",
    tenantColumn: "workspace_id",
    labelColumns: ["name"],
  },
  {
    entityType: "note",
    table: "notes",
    tenantColumn: "workspace_id",
    labelColumns: ["title", "content"],
  },
];

function pickLabel(row: Record<string, unknown>, labelColumns: string[]): string {
  for (const col of labelColumns) {
    const value = row[col];
    if (typeof value === "string" && value.trim()) {
      if (col === "content") {
        const firstLine = value.split("\n")[0]?.replace(/^#+\s*/, "").trim();
        return firstLine || "Untitled note";
      }
      return value.trim();
    }
  }
  return "Untitled";
}

async function fetchProfileNames(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const map = new Map<string, string>();
  for (const profile of data ?? []) {
    const name =
      (typeof profile.full_name === "string" && profile.full_name.trim()) ||
      (typeof profile.email === "string" ? profile.email : "Unknown");
    map.set(profile.id, name);
  }
  return map;
}

async function queryArchivedForEntity(
  workspaceId: string,
  config: EntityQueryConfig,
): Promise<MemoryTrashItem[]> {
  try {
    const supabase = createAdminClient();
    const selectFields = [
      "id",
      "archived_at",
      ...config.labelColumns,
      ...(config.sublabelColumn ? [config.sublabelColumn] : []),
    ].join(", ");

    const { data, error } = await supabase
      .from(config.table)
      .select(selectFields)
      .eq(config.tenantColumn, workspaceId)
      .not("archived_at", "is", null)
      .is("deleted_at", null)
      .order("archived_at", { ascending: false });

    if (error) {
      console.error(`Failed to load archived ${config.entityType}:`, error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const record = row as unknown as Record<string, unknown>;
      return {
        entityType: config.entityType,
        id: record.id as string,
        label: pickLabel(record, config.labelColumns),
        sublabel: config.sublabelColumn
          ? (record[config.sublabelColumn] as string | null) ?? null
          : null,
        archivedAt: record.archived_at as string,
      };
    });
  } catch (error) {
    console.error(`Failed to load archived ${config.entityType}:`, error);
    return [];
  }
}

async function queryTrashForEntity(
  workspaceId: string,
  config: EntityQueryConfig,
): Promise<MemoryTrashItem[]> {
  try {
    const supabase = createAdminClient();
    const selectFields = [
      "id",
      "deleted_at",
      "deleted_by",
      ...config.labelColumns,
      ...(config.sublabelColumn ? [config.sublabelColumn] : []),
    ].join(", ");

    const { data, error } = await supabase
      .from(config.table)
      .select(selectFields)
      .eq(config.tenantColumn, workspaceId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error(`Failed to load trash ${config.entityType}:`, error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const record = row as unknown as Record<string, unknown>;
      const deletedAt = record.deleted_at as string;
      return {
        entityType: config.entityType,
        id: record.id as string,
        label: pickLabel(record, config.labelColumns),
        sublabel: config.sublabelColumn
          ? (record[config.sublabelColumn] as string | null) ?? null
          : null,
        deletedAt,
        deletedBy: (record.deleted_by as string | null) ?? null,
        purgeAt: computePurgeAt(deletedAt),
      };
    });
  } catch (error) {
    console.error(`Failed to load trash ${config.entityType}:`, error);
    return [];
  }
}

function sortByDateDesc(items: MemoryTrashItem[], field: "archivedAt" | "deletedAt"): MemoryTrashItem[] {
  return [...items].sort((a, b) => {
    const aDate = a[field] ?? "";
    const bDate = b[field] ?? "";
    return bDate.localeCompare(aDate);
  });
}

export async function getArchivedItems(workspaceId: string): Promise<MemoryTrashItem[]> {
  const results = await Promise.all(
    ENTITY_QUERIES.map((config) => queryArchivedForEntity(workspaceId, config)),
  );
  return sortByDateDesc(results.flat(), "archivedAt");
}

export async function getTrashItems(workspaceId: string): Promise<MemoryTrashItem[]> {
  const results = await Promise.all(
    ENTITY_QUERIES.map((config) => queryTrashForEntity(workspaceId, config)),
  );
  const items = results.flat();
  const deletedByIds = [
    ...new Set(items.map((i) => i.deletedBy).filter((id): id is string => Boolean(id))),
  ];
  const profileNames = await fetchProfileNames(deletedByIds);

  return sortByDateDesc(
    items.map((item) => ({
      ...item,
      deletedByName: item.deletedBy ? profileNames.get(item.deletedBy) ?? null : null,
    })),
    "deletedAt",
  );
}

export async function getMemoryTrashForEntity(
  workspaceId: string,
  entityType: TrashEntityType,
): Promise<{ archivedItems: MemoryTrashItem[]; trashItems: MemoryTrashItem[] }> {
  const [archivedItems, trashItems] = await Promise.all([
    getArchivedItems(workspaceId),
    getTrashItems(workspaceId),
  ]);

  return {
    archivedItems: archivedItems.filter((item) => item.entityType === entityType),
    trashItems: trashItems.filter((item) => item.entityType === entityType),
  };
}
