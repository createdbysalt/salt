import { describe, it, expect } from "vitest";

import {
  aggregateCaptureRows,
  bucketCanaryByHour,
  bucketPeriodOverPeriod,
  bucketQualification,
  bucketSignupsByDay,
  groupIntegrations,
  groupTiers,
  groupWebhookOutcomes,
  latestCanaryPerSlug,
  mapAccountStatus,
  trialToPaidPercent,
  summarizeDiscovery,
  summarizeSpend,
  usageRiskCount,
  SPEND_SCAN_CAP,
} from "./queries";

describe("groupTiers", () => {
  it("counts workspaces per tier, sorted by count desc", () => {
    const rows = [
      { tier: "free" },
      { tier: "pro" },
      { tier: "free" },
      { tier: "free" },
      { tier: "pro" },
    ];
    expect(groupTiers(rows)).toEqual([
      { key: "free", count: 3 },
      { key: "pro", count: 2 },
    ]);
  });

  it("handles empty input", () => {
    expect(groupTiers([])).toEqual([]);
  });
});

describe("groupIntegrations registry filter", () => {
  it("drops rows for providers outside the supported set", () => {
    const rows = [
      { provider: "gmail", composio_status: "ACTIVE", is_active: true },
      { provider: "linear", composio_status: "ACTIVE", is_active: true },
      { provider: "mercury", composio_status: "ACTIVE", is_active: true },
    ];
    const supported = new Set(["gmail", "slack"]);
    expect(groupIntegrations(rows, supported)).toEqual([
      { provider: "gmail", problems: [], active: 1, inactive: 0 },
    ]);
  });

  it("keeps everything when no supported set is given", () => {
    const rows = [
      { provider: "linear", composio_status: "ACTIVE", is_active: true },
    ];
    expect(groupIntegrations(rows)).toHaveLength(1);
  });
});

describe("groupIntegrations", () => {
  it("rolls up to one row per provider with active/inactive split", () => {
    const rows = [
      { provider: "gmail", composio_status: "ACTIVE", is_active: true },
      { provider: "gmail", composio_status: "ACTIVE", is_active: true },
      { provider: "gmail", composio_status: "FAILED", is_active: false },
      { provider: "outlook", composio_status: null, is_active: null },
    ];
    expect(groupIntegrations(rows)).toEqual([
      {
        provider: "gmail",
        problems: [{ key: "FAILED", count: 1 }],
        active: 2,
        inactive: 1,
      },
      {
        provider: "outlook",
        problems: [],
        active: 0,
        inactive: 1,
      },
    ]);
  });

  it("treats active/connected casing variants as healthy, not problems", () => {
    const rows = [
      { provider: "slack", composio_status: "active", is_active: true },
      { provider: "slack", composio_status: "connected", is_active: true },
      { provider: "slack", composio_status: "ACTIVE", is_active: true },
    ];
    expect(groupIntegrations(rows)).toEqual([
      { provider: "slack", problems: [], active: 3, inactive: 0 },
    ]);
  });
});

describe("latestCanaryPerSlug", () => {
  it("keeps the newest row per target and sorts failures first", () => {
    const rows = [
      {
        target: "OUTLOOK_GET_MESSAGE",
        toolkit: "outlook",
        status: "ok",
        error_code: null,
        latency_ms: 200,
        checked_at: "2026-08-30T04:00:00Z",
      },
      {
        target: "SLACK_CONVERSATIONS_LIST",
        toolkit: "slack",
        status: "failed",
        error_code: "tool_not_found",
        latency_ms: 500,
        checked_at: "2026-08-30T04:00:00Z",
      },
      {
        target: "OUTLOOK_GET_MESSAGE",
        toolkit: "outlook",
        status: "failed",
        error_code: "composio_5xx",
        latency_ms: 900,
        checked_at: "2026-08-30T03:00:00Z",
      },
    ];
    const latest = latestCanaryPerSlug(rows);
    expect(latest).toHaveLength(2);
    expect(latest[0]).toMatchObject({
      slug: "SLACK_CONVERSATIONS_LIST",
      status: "failed",
      errorCode: "tool_not_found",
    });
    expect(latest[1]).toMatchObject({
      slug: "OUTLOOK_GET_MESSAGE",
      status: "ok",
      errorCode: null,
    });
  });
});

describe("groupWebhookOutcomes", () => {
  it("counts by detail.outcome, ignoring rows without one", () => {
    const rows = [
      { detail: { outcome: "declined" } },
      { detail: { outcome: "no_account" } },
      { detail: { outcome: "declined" } },
      { detail: null },
      { detail: { payloadKeys: ["a"] } },
    ];
    expect(groupWebhookOutcomes(rows)).toEqual([
      { key: "declined", count: 2 },
      { key: "no_account", count: 1 },
    ]);
  });
});

describe("aggregateCaptureRows", () => {
  it("rolls up source_type and gate_action distributions", () => {
    const rows = [
      { source_type: "email", gate_action: "hold" },
      { source_type: "email", gate_action: "candidate" },
      { source_type: "email", gate_action: "hold" },
      { source_type: "meeting", gate_action: null },
    ];
    const rollup = aggregateCaptureRows(rows);
    expect(rollup.total).toBe(4);
    expect(rollup.bySourceType).toEqual([
      { key: "email", count: 3 },
      { key: "meeting", count: 1 },
    ]);
    expect(rollup.byGateAction).toEqual([
      { key: "hold", count: 2 },
      { key: "candidate", count: 1 },
      { key: "ungated", count: 1 },
    ]);
  });
});

describe("summarizeDiscovery", () => {
  it("maps discovery errors and skips into dashboard rows", () => {
    const health = summarizeDiscovery({
      sections: new Map(),
      allPlaybooks: [{}, {}] as never[],
      errors: [
        {
          file: "billing/invoice-reminder/definition.yaml",
          errors: ["value.estimate: Number must be an integer"],
        },
      ],
      skipped: [
        {
          path: "communication",
          reason: "missing _section.yaml",
          filesPresent: ["definition.yaml"],
        },
      ],
    });
    expect(health.totalPlaybooks).toBe(2);
    expect(health.errors).toEqual([
      {
        file: "billing/invoice-reminder/definition.yaml",
        messages: ["value.estimate: Number must be an integer"],
      },
    ]);
    expect(health.skipped).toEqual([
      { path: "communication", reason: "missing _section.yaml" },
    ]);
  });

  it("reports a healthy library as zero errors and zero skips", () => {
    const health = summarizeDiscovery({
      sections: new Map(),
      allPlaybooks: [{}] as never[],
      errors: [],
      skipped: [],
    });
    expect(health).toEqual({ totalPlaybooks: 1, errors: [], skipped: [] });
  });
});

describe("summarizeSpend", () => {
  const names = new Map([
    ["ws-1", "Ada Studio"],
    ["ws-2", "Bea Design"],
  ]);

  it("sums MTD micros and ranks workspaces by spend", () => {
    const rows = [
      { workspace_id: "ws-1", cost_estimate_micros: 300 },
      { workspace_id: "ws-2", cost_estimate_micros: 900 },
      { workspace_id: "ws-1", cost_estimate_micros: 100 },
      { workspace_id: "ws-2", cost_estimate_micros: 100 },
    ];
    const spend = summarizeSpend(rows, names, 10);
    expect(spend.mtdMicros).toBe(1400);
    expect(spend.truncated).toBe(false);
    expect(spend.topWorkspaces).toEqual([
      { workspaceId: "ws-2", name: "Bea Design", micros: 1000 },
      { workspaceId: "ws-1", name: "Ada Studio", micros: 400 },
    ]);
  });

  it("flags truncation when the scan cap is hit so the number never lies", () => {
    const rows = Array.from({ length: SPEND_SCAN_CAP }, () => ({
      workspace_id: "ws-1",
      cost_estimate_micros: 1,
    }));
    const spend = summarizeSpend(rows, names, 10);
    expect(spend.truncated).toBe(true);
  });

  it("caps the leaderboard at the requested size and labels unknown workspaces", () => {
    const rows = [
      { workspace_id: "ws-1", cost_estimate_micros: 5 },
      { workspace_id: "ws-unknown", cost_estimate_micros: 50 },
    ];
    const spend = summarizeSpend(rows, names, 1);
    expect(spend.topWorkspaces).toHaveLength(1);
    expect(spend.topWorkspaces[0]).toMatchObject({
      workspaceId: "ws-unknown",
      name: null,
      micros: 50,
    });
  });
});

describe("bucketSignupsByDay", () => {
  const now = new Date("2026-08-30T12:00:00Z");

  it("fills every day in the window, zero-filling gaps", () => {
    const points = bucketSignupsByDay([], 3, now);
    expect(points).toEqual([
      { date: "2026-08-28", signups: 0, waitlist: 0 },
      { date: "2026-08-29", signups: 0, waitlist: 0 },
      { date: "2026-08-30", signups: 0, waitlist: 0 },
    ]);
  });

  it("counts signups per UTC day", () => {
    const points = bucketSignupsByDay(
      [
        { created_at: "2026-08-29T08:00:00Z" },
        { created_at: "2026-08-29T22:30:00Z" },
        { created_at: "2026-08-30T01:00:00Z" },
      ],
      3,
      now,
    );
    expect(points).toEqual([
      { date: "2026-08-28", signups: 0, waitlist: 0 },
      { date: "2026-08-29", signups: 2, waitlist: 0 },
      { date: "2026-08-30", signups: 1, waitlist: 0 },
    ]);
  });

  it("buckets waitlist leads alongside signups", () => {
    const points = bucketSignupsByDay(
      [{ created_at: "2026-08-30T01:00:00Z" }],
      3,
      now,
      [
        { created_at: "2026-08-28T10:00:00Z" },
        { created_at: "2026-08-30T09:00:00Z" },
        { created_at: "2026-08-30T11:00:00Z" },
      ],
    );
    expect(points).toEqual([
      { date: "2026-08-28", signups: 0, waitlist: 1 },
      { date: "2026-08-29", signups: 0, waitlist: 0 },
      { date: "2026-08-30", signups: 1, waitlist: 2 },
    ]);
  });
});

describe("bucketCanaryByHour", () => {
  const now = new Date("2026-08-30T12:45:00Z");

  it("fills every hour in the window, zero-filling gaps", () => {
    const points = bucketCanaryByHour([], 3, now);
    expect(points).toEqual([
      { hour: "2026-08-30T10:00:00.000Z", ok: 0, failed: 0 },
      { hour: "2026-08-30T11:00:00.000Z", ok: 0, failed: 0 },
      { hour: "2026-08-30T12:00:00.000Z", ok: 0, failed: 0 },
    ]);
  });

  it("splits ok and failed outcomes into the same hour bucket", () => {
    const points = bucketCanaryByHour(
      [
        { checked_at: "2026-08-30T11:05:00Z", status: "ok" },
        { checked_at: "2026-08-30T11:20:00Z", status: "ok" },
        { checked_at: "2026-08-30T11:40:00Z", status: "failed" },
      ],
      3,
      now,
    );
    expect(points[1]).toEqual({
      hour: "2026-08-30T11:00:00.000Z",
      ok: 2,
      failed: 1,
    });
  });

  it("treats any non-ok status as failed", () => {
    const points = bucketCanaryByHour(
      [{ checked_at: "2026-08-30T12:05:00Z", status: "error" }],
      1,
      now,
    );
    expect(points[0]).toEqual({
      hour: "2026-08-30T12:00:00.000Z",
      ok: 0,
      failed: 1,
    });
  });
});

describe("mapAccountStatus", () => {
  it("maps canceled ahead of cancel-at-period-end", () => {
    expect(
      mapAccountStatus({ status: "canceled", cancel_at_period_end: true }),
    ).toBe("canceled");
  });

  it("maps cancel-at-period-end as canceling while still active", () => {
    expect(
      mapAccountStatus({ status: "active", cancel_at_period_end: true }),
    ).toBe("canceling");
  });

  it("maps Stripe statuses onto the People facets", () => {
    expect(
      mapAccountStatus({ status: "trialing", cancel_at_period_end: false }),
    ).toBe("trial");
    expect(
      mapAccountStatus({ status: "active", cancel_at_period_end: false }),
    ).toBe("paid");
    expect(
      mapAccountStatus({ status: "past_due", cancel_at_period_end: false }),
    ).toBe("past_due");
    expect(
      mapAccountStatus({ status: "incomplete", cancel_at_period_end: false }),
    ).toBe("trial");
  });
});

describe("bucketQualification", () => {
  it("counts by waitlist field and uses the human labels", () => {
    const leads = [
      { metadata: { qualification: { primaryBusiness: "coaching" } } },
      { metadata: { qualification: { primaryBusiness: "coaching" } } },
      { metadata: { qualification: { primaryBusiness: "consulting" } } },
    ];
    expect(bucketQualification(leads, "primaryBusiness")).toEqual([
      { key: "Coaching", count: 2 },
      { key: "Consulting", count: 1 },
    ]);
  });

  it("keeps revenue bands in form order, not count order", () => {
    const leads = [
      { metadata: { qualification: { annualRevenue: "200k-plus" } } },
      { metadata: { qualification: { annualRevenue: "200k-plus" } } },
      { metadata: { qualification: { annualRevenue: "below-50k" } } },
    ];
    expect(bucketQualification(leads, "annualRevenue")).toEqual([
      { key: "$200K+", count: 2 },
      { key: "Below $50K", count: 1 },
    ]);
  });
});

describe("bucketPeriodOverPeriod", () => {
  const now = new Date("2026-08-30T12:00:00Z");

  it("aligns the previous window onto the current dates", () => {
    const points = bucketPeriodOverPeriod(
      [
        { created_at: "2026-08-29T10:00:00Z" },
        { created_at: "2026-08-30T08:00:00Z" },
        { created_at: "2026-08-30T11:00:00Z" },
        { created_at: "2026-08-27T10:00:00Z" },
      ],
      3,
      now,
    );
    expect(points).toEqual([
      { date: "2026-08-28", current: 0, previous: 0 },
      { date: "2026-08-29", current: 1, previous: 0 },
      { date: "2026-08-30", current: 2, previous: 1 },
    ]);
  });
});

describe("trialToPaidPercent", () => {
  it("returns the paid share of the live funnel", () => {
    expect(trialToPaidPercent(3, 1)).toBe(25);
    expect(trialToPaidPercent(0, 0)).toBeNull();
  });
});

describe("usageRiskCount", () => {
  it("counts accounts at or over the threshold of their bundle", () => {
    expect(
      usageRiskCount(
        [
          { used: 20, included: 25 },
          { used: 10, included: 25 },
          { used: 25, included: 25 },
          { used: 5, included: 0 },
        ],
        0.8,
      ),
    ).toBe(2);
  });
});
