import type { ColumnDef, Table as TanstackTable } from "@tanstack/react-table";

export type DataTableColumnMeta = {
  displayLabel?: string;
};

/** "entityType" → "Entity Type", "lastActiveAt" → "Last Active At" */
export function humanizeColumnId(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getColumnDisplayLabel<TData>(column: {
  id: string;
  columnDef: ColumnDef<TData, unknown>;
}): string {
  const meta = column.columnDef.meta as DataTableColumnMeta | undefined;
  if (meta?.displayLabel) return meta.displayLabel;

  const header = column.columnDef.header;
  if (typeof header === "string") return header;

  return humanizeColumnId(column.id);
}

export function resolveFilterSectionLabel<TData>(
  table: TanstackTable<TData>,
  filter: { columnId: string; label?: string },
): string {
  if (filter.label) return filter.label;

  const column = table.getColumn(filter.columnId);
  if (column) return getColumnDisplayLabel(column);

  return humanizeColumnId(filter.columnId);
}
