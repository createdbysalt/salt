import { describe, expect, it } from "vitest";
import {
  computePlaybookRunStats,
  computeWorkspaceRunStats,
  estimatePlaybookRunDurationMs,
  formatDurationMs,
  formatMinutes,
  median,
  runCompletedAt,
  type CompletedRunRow,
} from "./run-stats";

const NOW = new Date("2026-08-08T12:00:00Z");

function row(partial: Partial<CompletedRunRow>): CompletedRunRow {
  return {
    playbookSlug: "email-triage",
    ranAt: null,
    approvedAt: null,
    createdAt: "2026-08-01T00:00:00Z",
    ...partial,
  };
}

describe("runCompletedAt", () => {
  it("prefers ran_at, falls back to approved_at, rejects garbage", () => {
    expect(
      runCompletedAt(row({ ranAt: "2026-08-08T10:00:00Z" }))?.toISOString()
    ).toBe("2026-08-08T10:00:00.000Z");
    expect(
      runCompletedAt(row({ approvedAt: "2026-08-07T09:00:00Z" }))?.toISOString()
    ).toBe("2026-08-07T09:00:00.000Z");
    expect(runCompletedAt(row({}))).toBeNull();
    expect(runCompletedAt(row({ ranAt: "not-a-date" }))).toBeNull();
  });
});

describe("median", () => {
  it("handles empty, odd, and even lists", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([10, 2, 8])).toBe(8);
    expect(median([10, 2, 8, 4])).toBe(6);
  });
});

describe("computePlaybookRunStats", () => {
  it("counts trailing-7-day runs against now, all-time otherwise", () => {
    const rows = [
      row({ ranAt: "2026-08-08T06:00:00Z" }), // this week
      row({ ranAt: "2026-08-02T12:00:00Z" }), // this week (boundary)
      row({ ranAt: "2026-07-20T12:00:00Z" }), // older
    ];

    const stats = computePlaybookRunStats(rows, [8000, 12000], 15, NOW);

    expect(stats.totalRuns).toBe(3);
    expect(stats.runsThisWeek).toBe(2);
    expect(stats.medianDurationMs).toBe(10000);
    expect(stats.minutesSavedPerRun).toBe(15);
    expect(stats.totalMinutesSaved).toBe(45);
  });

  it("returns null minutes when the playbook declares no estimate", () => {
    const stats = computePlaybookRunStats(
      [row({ ranAt: "2026-08-08T06:00:00Z" })],
      [],
      null,
      NOW
    );

    expect(stats.medianDurationMs).toBeNull();
    expect(stats.minutesSavedPerRun).toBeNull();
    expect(stats.totalMinutesSaved).toBeNull();
  });

  it("ignores rows with no completion timestamp", () => {
    const stats = computePlaybookRunStats([row({})], [], 10, NOW);
    expect(stats.totalRuns).toBe(0);
    expect(stats.runsThisWeek).toBe(0);
  });
});

describe("computeWorkspaceRunStats", () => {
  // Day buckets are local-time (what a human means by "today"), so fixtures
  // are built in local time to stay TZ-independent.
  const local = (daysAgo: number, hour = 6) => {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  it("sums minutes by playbook estimate and buckets by day", () => {
    const estimates = new Map([
      ["email-triage", 2],
      ["invoice-reminder", 10],
    ]);
    const rows = [
      row({ playbookSlug: "email-triage", ranAt: local(0, 6) }),
      row({ playbookSlug: "invoice-reminder", ranAt: local(0, 7) }),
      row({ playbookSlug: "unknown-slug", ranAt: local(0, 8) }),
      row({ playbookSlug: "email-triage", ranAt: local(5) }),
    ];

    const stats = computeWorkspaceRunStats(rows, estimates, NOW);

    // Today: 2 + 10 + 0 (unknown slug contributes nothing)
    expect(stats.minutesByDay[6]).toBe(12);
    // 5 days back → index 1
    expect(stats.minutesByDay[1]).toBe(2);
    expect(stats.minutesThisWeek).toBe(14);
    expect(stats.minutesLastWeek).toBe(0);
    expect(stats.runsThisWeek).toBe(4);
    expect(stats.hasActivity).toBe(true);
  });

  it("splits last week out of the trailing window", () => {
    const estimates = new Map([["email-triage", 5]]);
    const rows = [
      row({ ranAt: local(0) }), // today
      row({ ranAt: local(3) }), // this week
      row({ ranAt: local(7) }), // last week (7 days before today)
    ];

    const stats = computeWorkspaceRunStats(rows, estimates, NOW);

    expect(stats.minutesThisWeek).toBe(10);
    expect(stats.minutesLastWeek).toBe(5);
  });

  it("handles an empty workspace", () => {
    const stats = computeWorkspaceRunStats([], new Map(), NOW);
    expect(stats.minutesThisWeek).toBe(0);
    expect(stats.minutesLastWeek).toBe(0);
    expect(stats.minutesByDay).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(stats.hasActivity).toBe(false);
  });
});

describe("estimatePlaybookRunDurationMs", () => {
  it("sums per-step heuristics for a no-approval end-to-end run", () => {
    const ms = estimatePlaybookRunDurationMs([
      { step: "fetch" },
      { step: "classify" },
      { step: "draft" },
      { step: "action" },
    ]);
    expect(ms).toBe(1500 + 3000 + 6000 + 1000);
  });

  it("falls back to 1s for unknown step types", () => {
    expect(estimatePlaybookRunDurationMs([{ step: "mystery" }])).toBe(1000);
  });

  it("returns null when the playbook declares no steps", () => {
    expect(estimatePlaybookRunDurationMs([])).toBeNull();
    expect(estimatePlaybookRunDurationMs(undefined)).toBeNull();
    expect(estimatePlaybookRunDurationMs(null)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(85)).toBe("1h 25m");
  });

  it("formats durations", () => {
    expect(formatDurationMs(400)).toBe("<1s");
    expect(formatDurationMs(8000)).toBe("8s");
    expect(formatDurationMs(72_000)).toBe("1.2m");
  });
});
