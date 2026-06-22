import { beforeEach, describe, expect, it, vi } from "vitest";
import { getArchivedItems, getTrashItems } from "./trash";

const mockFrom = vi.fn();

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

function createTableBuilder(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.not = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.order = vi.fn(async () => ({ data: rows, error: null }));
  builder.in = vi.fn(async () => ({ data: [], error: null }));
  return builder;
}

describe("memory trash queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getArchivedItems merges and sorts archived rows across entity types", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        return createTableBuilder([
          {
            id: "p1",
            name: "Jane Doe",
            email: "jane@acme.com",
            archived_at: "2026-06-18T00:00:00.000Z",
          },
        ]);
      }
      if (table === "organizations") {
        return createTableBuilder([
          {
            id: "o1",
            name: "Acme",
            domain: "acme.com",
            archived_at: "2026-06-19T00:00:00.000Z",
          },
        ]);
      }
      return createTableBuilder([]);
    });

    const items = await getArchivedItems("ws-1");

    expect(items).toHaveLength(2);
    expect(items[0]?.entityType).toBe("org");
    expect(items[0]?.label).toBe("Acme");
    expect(items[1]?.entityType).toBe("person");
    expect(items[1]?.label).toBe("Jane Doe");
  });

  it("getTrashItems computes purgeAt for deleted rows", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        return createTableBuilder([
          {
            id: "p1",
            name: "Jane Doe",
            email: "jane@acme.com",
            deleted_at: "2026-06-01T00:00:00.000Z",
            deleted_by: null,
          },
        ]);
      }
      if (table === "profiles") {
        return createTableBuilder([]);
      }
      return createTableBuilder([]);
    });

    const items = await getTrashItems("ws-1");

    expect(items).toHaveLength(1);
    expect(items[0]?.purgeAt).toBe("2026-07-01T00:00:00.000Z");
  });
});
