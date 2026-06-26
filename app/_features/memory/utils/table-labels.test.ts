import { describe, expect, it } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getColumnDisplayLabel,
  humanizeColumnId,
  resolveFilterSectionLabel,
} from "./table-labels";

describe("humanizeColumnId", () => {
  it("splits camelCase and snake_case ids", () => {
    expect(humanizeColumnId("entityType")).toBe("Entity Type");
    expect(humanizeColumnId("last_active_at")).toBe("Last Active At");
    expect(humanizeColumnId("removedBy")).toBe("Removed By");
  });
});

describe("getColumnDisplayLabel", () => {
  it("prefers meta.displayLabel", () => {
    const column = {
      id: "entityType",
      columnDef: {
        header: "Type",
        meta: { displayLabel: "Item type" },
      } satisfies ColumnDef<unknown>,
    };

    expect(getColumnDisplayLabel(column)).toBe("Item type");
  });

  it("uses string column headers", () => {
    const column = {
      id: "entityType",
      columnDef: { header: "Type" } satisfies ColumnDef<unknown>,
    };

    expect(getColumnDisplayLabel(column)).toBe("Type");
  });

  it("humanizes the column id when header is not a string", () => {
    const column = {
      id: "workspaceRole",
      columnDef: {
        id: "workspaceRole",
        header: () => "Role",
      } satisfies ColumnDef<unknown>,
    };

    expect(getColumnDisplayLabel(column)).toBe("Workspace Role");
  });
});

describe("resolveFilterSectionLabel", () => {
  it("uses explicit filter labels when provided", () => {
    const table = {
      getColumn: () => undefined,
    } as unknown as Parameters<typeof resolveFilterSectionLabel>[0];

    expect(resolveFilterSectionLabel(table, { columnId: "status", label: "Stage" })).toBe(
      "Stage",
    );
  });

  it("falls back to column header labels", () => {
    const table = {
      getColumn: (id: string) =>
        id === "entityType"
          ? {
              id: "entityType",
              columnDef: { header: "Type" },
            }
          : undefined,
    } as unknown as Parameters<typeof resolveFilterSectionLabel>[0];

    expect(resolveFilterSectionLabel(table, { columnId: "entityType" })).toBe("Type");
  });
});
