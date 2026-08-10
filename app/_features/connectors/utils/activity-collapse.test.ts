import { describe, expect, it } from "vitest";
import type { ConnectorActivityEntry } from "../types";
import { collapseConnectorActivity } from "./activity-collapse";

function entry(
  overrides: Partial<ConnectorActivityEntry> & { id: string },
): ConnectorActivityEntry {
  return {
    toolSlug: "GMAIL_FETCH_EMAILS",
    provider: "gmail",
    risk: "read",
    source: "background",
    status: "success",
    argsSummary: null,
    summary: null,
    error: null,
    approvedBy: null,
    createdAt: "2026-08-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("collapseConnectorActivity (P5)", () => {
  it("groups consecutive background rows with the same slug and detail", () => {
    // A 3-page background fetch renders as one row, not three.
    const q = { q: "in:inbox after:2026/08/07" };
    const rows = collapseConnectorActivity([
      entry({ id: "a", argsSummary: q }),
      entry({ id: "b", argsSummary: q }),
      entry({ id: "c", argsSummary: q }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(3);
    expect(rows[0].entry.id).toBe("a");
  });

  it("keeps interactive rows and differing details ungrouped", () => {
    const q = { q: "in:inbox after:2026/08/07" };
    const rows = collapseConnectorActivity([
      entry({ id: "a", argsSummary: q }),
      entry({ id: "b", argsSummary: q, source: "ask_salt" }),
      entry({ id: "c", argsSummary: q }),
    ]);
    expect(rows.map((row) => row.count)).toEqual([1, 1, 1]);
  });

  it("does not collapse across different slugs or errors", () => {
    const rows = collapseConnectorActivity([
      entry({ id: "a" }),
      entry({ id: "b", toolSlug: "GMAIL_LIST_THREADS" }),
      entry({ id: "c", status: "error", error: "boom" }),
      entry({ id: "d", status: "error", error: "boom" }),
    ]);
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.count === 1)).toBe(true);
  });

  it("collapses category-generally (slug + translated detail, not Gmail specifics)", () => {
    const rows = collapseConnectorActivity([
      entry({
        id: "a",
        provider: "stripe",
        toolSlug: "STRIPE_LIST_INVOICES",
      }),
      entry({
        id: "b",
        provider: "stripe",
        toolSlug: "STRIPE_LIST_INVOICES",
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(2);
  });
});
