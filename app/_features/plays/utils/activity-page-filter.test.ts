import { describe, expect, it } from "vitest";
import {
  activityMatchesDateRange,
  activityMatchesSearch,
  activitySortIso,
  filterActivityScanRows,
  paginateActivityRows,
  type ActivityScanRow,
} from "./activity-page-filter";

function row(overrides: Partial<ActivityScanRow> = {}): ActivityScanRow {
  return {
    id: "run-1",
    state: "ran",
    title: "Sent invoice reminder",
    target_label: "Taylor Example",
    recipient_label: null,
    // Noon local time keeps assertions inside the local day in any timezone.
    ran_at: new Date(2026, 7, 10, 12).toISOString(),
    dismissed_at: null,
    updated_at: new Date(2026, 7, 10, 12).toISOString(),
    source_context: null,
    ...overrides,
  };
}

describe("activitySortIso", () => {
  it("prefers ran_at, then dismissed_at, then updated_at", () => {
    expect(activitySortIso(row())).toBe(row().ran_at);
    expect(activitySortIso(row({ ran_at: null, dismissed_at: "2026-08-09T10:00:00.000Z" }))).toBe(
      "2026-08-09T10:00:00.000Z",
    );
    expect(activitySortIso(row({ ran_at: null, dismissed_at: null }))).toBe(
      row().updated_at,
    );
  });
});

describe("activityMatchesDateRange", () => {
  const iso = new Date(2026, 7, 10, 12).toISOString();

  it("matches everything with no range", () => {
    expect(activityMatchesDateRange(iso)).toBe(true);
  });

  it("includes both boundary days", () => {
    expect(activityMatchesDateRange(iso, "2026-08-10", "2026-08-10")).toBe(true);
    expect(activityMatchesDateRange(iso, "2026-08-09", "2026-08-10")).toBe(true);
    expect(activityMatchesDateRange(iso, "2026-08-10", "2026-08-11")).toBe(true);
  });

  it("excludes days outside the range", () => {
    expect(activityMatchesDateRange(iso, "2026-08-11", "2026-08-12")).toBe(false);
    expect(activityMatchesDateRange(iso, "2026-08-01", "2026-08-09")).toBe(false);
  });

  it("supports open-ended ranges", () => {
    expect(activityMatchesDateRange(iso, "2026-08-01")).toBe(true);
    expect(activityMatchesDateRange(iso, undefined, "2026-08-09")).toBe(false);
  });

  it("covers the full boundary day regardless of time", () => {
    const earlyMorning = new Date(2026, 7, 10, 0, 30).toISOString();
    const lateNight = new Date(2026, 7, 10, 23, 45).toISOString();
    expect(activityMatchesDateRange(earlyMorning, "2026-08-10", "2026-08-10")).toBe(true);
    expect(activityMatchesDateRange(lateNight, "2026-08-10", "2026-08-10")).toBe(true);
  });
});

describe("activityMatchesSearch", () => {
  it("matches title, target, and recipient case-insensitively", () => {
    expect(activityMatchesSearch(row(), "INVOICE")).toBe(true);
    expect(activityMatchesSearch(row(), "taylor")).toBe(true);
    expect(activityMatchesSearch(row({ target_label: null, recipient_label: "Acme Corp" }), "acme")).toBe(true);
  });

  it("matches the resolved playbook name", () => {
    expect(activityMatchesSearch(row(), "invoice reminder", "Invoice Reminder")).toBe(true);
    expect(activityMatchesSearch(row(), "unrelated playbook", "Invoice Reminder")).toBe(false);
  });

  it("matches everything for a blank term", () => {
    expect(activityMatchesSearch(row(), "   ")).toBe(true);
  });
});

describe("filterActivityScanRows", () => {
  const rows = [
    row({ id: "a", state: "ran", ran_at: new Date(2026, 7, 10, 12).toISOString() }),
    row({ id: "b", state: "failed", title: "Synced calendar", target_label: null, ran_at: null, updated_at: new Date(2026, 7, 9, 12).toISOString() }),
    row({ id: "c", state: "dismissed", title: "Follow-up draft", target_label: null, ran_at: null, dismissed_at: new Date(2026, 7, 8, 12).toISOString() }),
  ];

  it("filters by category via the state mapping", () => {
    expect(filterActivityScanRows(rows, { categories: ["completed"] }).map((r) => r.id)).toEqual(["a"]);
    expect(
      filterActivityScanRows(rows, { categories: ["needs-attention", "decided"] }).map((r) => r.id),
    ).toEqual(["b", "c"]);
  });

  it("sorts newest first by the display timestamp", () => {
    expect(filterActivityScanRows(rows, {}).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("combines date range and search", () => {
    const result = filterActivityScanRows(rows, {
      dateFrom: "2026-08-09",
      dateTo: "2026-08-10",
      search: "invoice",
    });
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("passes the playbook slug through the name resolver for search", () => {
    const withPlaybook = row({
      id: "p",
      title: "Stripe create customer",
      target_label: null,
      source_context: { source: "playbook", playbook_slug: "invoice-reminder" },
    });
    const result = filterActivityScanRows(
      [withPlaybook],
      { search: "invoice reminder" },
      (slug) => (slug === "invoice-reminder" ? "Invoice Reminder" : null),
    );
    expect(result).toHaveLength(1);
  });
});

describe("paginateActivityRows", () => {
  const rows = Array.from({ length: 55 }, (_, i) => ({ id: `r${i + 1}` }));

  it("slices the requested page", () => {
    const slice = paginateActivityRows(rows, 2, 25);
    expect(slice.pageRows.map((r) => r.id)).toEqual(
      Array.from({ length: 25 }, (_, i) => `r${26 + i}`),
    );
    expect(slice.totalCount).toBe(55);
    expect(slice.page).toBe(2);
  });

  it("returns a partial last page", () => {
    const slice = paginateActivityRows(rows, 3, 25);
    expect(slice.pageRows).toHaveLength(5);
  });

  it("clamps out-of-range pages", () => {
    expect(paginateActivityRows(rows, 99, 25).page).toBe(3);
    expect(paginateActivityRows(rows, 0, 25).page).toBe(1);
  });

  it("handles an empty result set", () => {
    const slice = paginateActivityRows([], 1, 25);
    expect(slice.pageRows).toEqual([]);
    expect(slice.totalCount).toBe(0);
    expect(slice.page).toBe(1);
  });
});
