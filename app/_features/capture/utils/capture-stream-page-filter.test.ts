import { describe, expect, it } from "vitest";
import {
  captureMatchesDateRange,
  captureMatchesSearch,
  captureScanCategory,
  captureScanHasWatch,
  computeCaptureStreamCounts,
  filterCaptureScanRows,
  isStreamVisibleGateAction,
  paginateCaptureScanRows,
  type CaptureScanRow,
} from "./capture-stream-page-filter";

function makeRow(overrides: Partial<CaptureScanRow> = {}): CaptureScanRow {
  return {
    id: "row-1",
    created_at: "2026-08-09T16:25:00.000Z",
    state: "pending",
    source_type: "gmail",
    is_bootstrap: false,
    gate_action: null,
    title: "Invoice from Acme",
    intelligence: null,
    known_entity_target: null,
    enriched_at: null,
    signals_matched: null,
    plays_dispatched: null,
    from_email: "billing@acme.com",
    from_name: "Acme Billing",
    sender_email: null,
    sender_name: null,
    subject: "Invoice #42",
    ...overrides,
  };
}

const noLink = () => null;

describe("isStreamVisibleGateAction", () => {
  it("hides dropped and held rows, keeps everything else", () => {
    expect(isStreamVisibleGateAction(null)).toBe(true);
    expect(isStreamVisibleGateAction("signal")).toBe(true);
    expect(isStreamVisibleGateAction("noise")).toBe(true);
    expect(isStreamVisibleGateAction("drop")).toBe(false);
    expect(isStreamVisibleGateAction("held")).toBe(false);
  });
});

describe("captureScanCategory", () => {
  it("maps enriched rows with dispatched plays to queued", () => {
    const row = makeRow({
      enriched_at: "2026-08-09T17:00:00.000Z",
      plays_dispatched: [{ play_run_id: "r1", play_name: "Follow up" }],
    });
    expect(captureScanCategory(row, null)).toBe("queued");
  });

  it("maps enriched rows without dispatches to no-signal", () => {
    const row = makeRow({ enriched_at: "2026-08-09T17:00:00.000Z" });
    expect(captureScanCategory(row, null)).toBe("no-signal");
  });

  it("maps noise-classified enriched rows to no-signal even with dispatches", () => {
    const row = makeRow({
      enriched_at: "2026-08-09T17:00:00.000Z",
      signals_matched: ["email_classified_noise"],
      plays_dispatched: [{ play_run_id: "r1", play_name: "Follow up" }],
    });
    expect(captureScanCategory(row, null)).toBe("no-signal");
  });

  it("falls back to intelligence outcome when not enriched", () => {
    const errorRow = makeRow({
      intelligence: { outcome: "scan_error", scanned_at: "2026-08-09T17:00:00.000Z" },
    });
    expect(captureScanCategory(errorRow, null)).toBe("error");

    const noSignalRow = makeRow({
      intelligence: { outcome: "no_signal", scanned_at: "2026-08-09T17:00:00.000Z" },
    });
    expect(captureScanCategory(noSignalRow, null)).toBe("no-signal");
  });

  it("treats an active finding link as needs-review, not a triggered play", () => {
    const row = makeRow({
      intelligence: {
        outcome: "finding_created",
        scanned_at: "2026-08-09T17:00:00.000Z",
        finding_id: "f1",
      },
    });
    const link = { finding_id: "f1", finding_type: "x", finding_state: "needs_you" };
    expect(captureScanCategory(row, link)).toBe("finding");
    // Same row without an active link collapses to no-signal
    expect(captureScanCategory(row, null)).toBe("no-signal");
  });

  it("keeps a finding visible as needs-review even after enrichment", () => {
    const row = makeRow({
      enriched_at: "2026-08-09T17:00:00.000Z",
      intelligence: {
        outcome: "finding_created",
        scanned_at: "2026-08-09T17:00:00.000Z",
        finding_id: "f1",
      },
    });
    const link = { finding_id: "f1", finding_type: "x", finding_state: "needs_you" };
    expect(captureScanCategory(row, link)).toBe("finding");
  });

  it("maps un-scanned rows to processing", () => {
    expect(captureScanCategory(makeRow(), null)).toBe("processing");
  });
});

describe("captureScanHasWatch", () => {
  it("requires both entityId and surface", () => {
    expect(
      captureScanHasWatch(
        makeRow({ known_entity_target: { entityId: "p1", surface: "people" } }),
      ),
    ).toBe(true);
    expect(captureScanHasWatch(makeRow({ known_entity_target: { entityId: "p1" } }))).toBe(false);
    expect(captureScanHasWatch(makeRow())).toBe(false);
  });
});

describe("captureMatchesDateRange", () => {
  const iso = "2026-08-09T16:25:00.000Z";

  it("matches inside the inclusive local-day range", () => {
    expect(captureMatchesDateRange(iso, "2026-08-09", "2026-08-09")).toBe(true);
    expect(captureMatchesDateRange(iso, "2026-08-01", "2026-08-10")).toBe(true);
  });

  it("rejects outside the range", () => {
    expect(captureMatchesDateRange(iso, "2026-08-10", "2026-08-11")).toBe(false);
    expect(captureMatchesDateRange(iso, "2026-08-01", "2026-08-08")).toBe(false);
  });

  it("passes with open bounds", () => {
    expect(captureMatchesDateRange(iso)).toBe(true);
    expect(captureMatchesDateRange(iso, undefined, "2026-08-09")).toBe(true);
    expect(captureMatchesDateRange(iso, "2026-08-10")).toBe(false);
  });
});

describe("captureMatchesSearch", () => {
  it("matches title, sender, and subject fields case-insensitively", () => {
    const row = makeRow();
    expect(captureMatchesSearch(row, "invoice")).toBe(true);
    expect(captureMatchesSearch(row, "ACME")).toBe(true);
    expect(captureMatchesSearch(row, "billing@acme")).toBe(true);
    expect(captureMatchesSearch(row, "#42")).toBe(true);
    expect(captureMatchesSearch(row, "nonexistent")).toBe(false);
  });

  it("passes on blank terms", () => {
    expect(captureMatchesSearch(makeRow(), "  ")).toBe(true);
  });
});

describe("filterCaptureScanRows", () => {
  const rows = [
    makeRow({ id: "a", created_at: "2026-08-09T10:00:00.000Z", title: "Alpha" }),
    makeRow({
      id: "b",
      created_at: "2026-08-08T10:00:00.000Z",
      title: "Bravo",
      source_type: "stripe",
      is_bootstrap: true,
    }),
    makeRow({
      id: "c",
      created_at: "2026-08-07T10:00:00.000Z",
      title: "Charlie",
      known_entity_target: { entityId: "p1", surface: "people" },
    }),
  ];

  it("sorts newest first", () => {
    const result = filterCaptureScanRows(rows, {}, noLink);
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by watching state", () => {
    const result = filterCaptureScanRows(rows, { state: "watching" }, noLink);
    expect(result.map((r) => r.id)).toEqual(["c"]);
  });

  it("kept-out is a peer status: matches only drop/held rows", () => {
    const withKeptOut = [
      ...rows,
      makeRow({ id: "d", gate_action: "held", title: "Held sender" }),
      makeRow({ id: "e", gate_action: "drop", title: "Dropped spam" }),
    ];
    const result = filterCaptureScanRows(withKeptOut, { state: "kept-out" }, noLink);
    expect(result.map((r) => r.id)).toEqual(["d", "e"]);
    // ...and stream-visible rows never match it, even un-gated ones
    expect(
      filterCaptureScanRows(rows, { state: "kept-out" }, noLink),
    ).toEqual([]);
  });

  it("includeKeptOut mixes kept-out rows into any view, bypassing the state filter", () => {
    const withKeptOut = [
      ...rows,
      makeRow({ id: "d", gate_action: "held", title: "Held sender" }),
      makeRow({ id: "e", gate_action: "drop", title: "Dropped spam" }),
    ];
    // Default (all): kept-out rows pass through — the caller scopes the scan.
    expect(
      filterCaptureScanRows(withKeptOut, {}, noLink).map((r) => r.id),
    ).toContain("d");
    // Status-filtered view without the preference: kept-out rows excluded.
    expect(
      filterCaptureScanRows(withKeptOut, { state: "processing" }, noLink).map(
        (r) => r.id,
      ),
    ).toEqual(["a", "b", "c"]);
    // With the preference: kept-out rows join, carrying no status.
    // (d/e use the makeRow default created_at, which is newest.)
    expect(
      filterCaptureScanRows(
        withKeptOut,
        { state: "processing", includeKeptOut: true },
        noLink,
      ).map((r) => r.id),
    ).toEqual(["d", "e", "a", "b", "c"]);
  });

  it("filters by category state", () => {
    const result = filterCaptureScanRows(rows, { state: "processing" }, noLink);
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(filterCaptureScanRows(rows, { state: "queued" }, noLink)).toEqual([]);
  });

  it("filters by area via the origin mapping", () => {
    expect(
      filterCaptureScanRows(rows, { area: "billing" }, noLink).map((r) => r.id),
    ).toEqual(["b"]);
    expect(
      filterCaptureScanRows(rows, { area: "email" }, noLink).map((r) => r.id),
    ).toEqual(["a", "c"]);
  });

  it("combines date range and search", () => {
    const result = filterCaptureScanRows(
      rows,
      { dateFrom: "2026-08-08", dateTo: "2026-08-09", search: "alpha" },
      noLink,
    );
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("paginateCaptureScanRows", () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({ id: `r${i}` }));

  it("slices the requested page", () => {
    const slice = paginateCaptureScanRows(rows, 2, 3);
    expect(slice.pageRows.map((r) => r.id)).toEqual(["r3", "r4", "r5"]);
    expect(slice.totalCount).toBe(7);
    expect(slice.page).toBe(2);
  });

  it("clamps out-of-range pages", () => {
    expect(paginateCaptureScanRows(rows, 99, 3).page).toBe(3);
    expect(paginateCaptureScanRows(rows, 0, 3).page).toBe(1);
    expect(paginateCaptureScanRows([], 5, 25).page).toBe(1);
  });
});

describe("computeCaptureStreamCounts", () => {
  it("counts categories, watches, and total across all rows", () => {
    const rows = [
      makeRow({ id: "q", enriched_at: "x", plays_dispatched: [{ play_run_id: "r", play_name: "p" }] }),
      makeRow({ id: "n", enriched_at: "x" }),
      makeRow({ id: "p" }),
      makeRow({
        id: "e",
        intelligence: { outcome: "scan_error", scanned_at: "2026-08-09T00:00:00.000Z" },
      }),
      makeRow({
        id: "w",
        known_entity_target: { entityId: "p1", surface: "people" },
      }),
    ];
    const counts = computeCaptureStreamCounts(rows, noLink);
    expect(counts).toEqual({
      total: 5,
      queued: 1,
      finding: 0,
      memory: 0,
      watching: 1,
      noSignal: 1,
      processing: 2, // un-scanned rows, including the watched one
      error: 1,
    });
  });

  it("counts routed rows as memory, not no-signal", () => {
    const rows = [makeRow({ id: "r", state: "routed" })];
    const counts = computeCaptureStreamCounts(rows, noLink);
    expect(counts.memory).toBe(1);
    expect(counts.noSignal).toBe(0);
  });
});
