import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  ALERT_THRESHOLD,
  CANARY_SLUGS,
  computeStreakAlert,
  formatCanaryAlertEmail,
  probeSlug,
  runSlugCanary,
  type CanaryAlert,
  type CanaryHistoryRow,
  type CanaryResult,
  type CanaryStore,
} from "./canary";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";

const TARGET = { toolkit: "outlook", slug: "OUTLOOK_GET_MESSAGE" } as const;
const CHECKED_AT = "2026-08-30T04:00:00.000Z";

function httpError(status: number, message = "boom"): Error {
  const cause = Object.assign(new Error(message), { status });
  return Object.assign(new Error(`Unable to retrieve tool: ${message}`), {
    name: "ComposioToolNotFoundError",
    cause,
  });
}

describe("CANARY_SLUGS registry", () => {
  it("only probes slugs the app actually executes", () => {
    const liveSlugs = new Set<string>(Object.values(COMPOSIO_TOOL_SLUGS));
    for (const target of CANARY_SLUGS) {
      expect(
        liveSlugs.has(target.slug),
        `${target.slug} is not in COMPOSIO_TOOL_SLUGS`,
      ).toBe(true);
    }
  });

  it("covers the highest-blast-radius toolkits", () => {
    const toolkits = new Set(CANARY_SLUGS.map((t) => t.toolkit));
    for (const toolkit of ["outlook", "gmail", "googlecalendar", "stripe"]) {
      expect(toolkits.has(toolkit), `missing ${toolkit}`).toBe(true);
    }
  });

  it("has unique slugs", () => {
    const slugs = CANARY_SLUGS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("probeSlug", () => {
  it("returns ok with latency when the tool resolves with a schema", async () => {
    const result = await probeSlug(
      TARGET,
      async () => ({ slug: TARGET.slug, inputParameters: { type: "object" } }),
      CHECKED_AT,
    );
    expect(result.status).toBe("ok");
    expect(result.errorCode).toBeNull();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.checkedAt).toBe(CHECKED_AT);
    expect(result.target).toBe(TARGET.slug);
    expect(result.toolkit).toBe("outlook");
  });

  it("fails with schema_missing when the tool resolves without inputParameters", async () => {
    const result = await probeSlug(
      TARGET,
      async () => ({ slug: TARGET.slug }),
      CHECKED_AT,
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("schema_missing");
  });

  it("fails with tool_not_found on a 404 cause (dead slug)", async () => {
    const result = await probeSlug(
      TARGET,
      async () => {
        throw httpError(404, "Tool_ToolNotFound");
      },
      CHECKED_AT,
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("tool_not_found");
    expect(result.errorMessage).toContain("Tool_ToolNotFound");
  });

  it("fails with composio_5xx on a server-error cause", async () => {
    const result = await probeSlug(
      TARGET,
      async () => {
        throw httpError(503);
      },
      CHECKED_AT,
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("composio_5xx");
  });

  it("fails with http_<status> on other HTTP causes", async () => {
    const result = await probeSlug(
      TARGET,
      async () => {
        throw httpError(429);
      },
      CHECKED_AT,
    );
    expect(result.errorCode).toBe("http_429");
  });

  it("fails with probe_error on non-HTTP errors", async () => {
    const result = await probeSlug(
      TARGET,
      async () => {
        throw new Error("socket hangup");
      },
      CHECKED_AT,
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("probe_error");
    expect(result.errorMessage).toContain("socket hangup");
  });
});

describe("computeStreakAlert", () => {
  const row = (status: "ok" | "failed", minutesAgo: number): CanaryHistoryRow => ({
    status,
    checked_at: new Date(Date.parse(CHECKED_AT) - minutesAgo * 60_000).toISOString(),
  });

  it("alerts once when the failure streak crosses the threshold", () => {
    const alert = computeStreakAlert(TARGET, [
      row("failed", 0),
      row("failed", 60),
      row("ok", 120),
    ]);
    expect(alert).toMatchObject({ type: "failure", streak: ALERT_THRESHOLD });
    expect(alert?.firstSeenAt).toBe(row("failed", 60).checked_at);
  });

  it("does not re-alert while the streak keeps growing", () => {
    const alert = computeStreakAlert(TARGET, [
      row("failed", 0),
      row("failed", 60),
      row("failed", 120),
    ]);
    expect(alert).toBeNull();
  });

  it("does not alert on a single failure", () => {
    expect(computeStreakAlert(TARGET, [row("failed", 0), row("ok", 60)])).toBeNull();
  });

  it("sends a recovery alert when a slug heals after an alerted streak", () => {
    const alert = computeStreakAlert(TARGET, [
      row("ok", 0),
      row("failed", 60),
      row("failed", 120),
    ]);
    expect(alert).toMatchObject({ type: "recovery", streak: 2 });
  });

  it("does not send recovery when the prior streak never reached the threshold", () => {
    expect(
      computeStreakAlert(TARGET, [row("ok", 0), row("failed", 60), row("ok", 120)]),
    ).toBeNull();
  });

  it("does not alert on the very first check of a healthy slug", () => {
    expect(computeStreakAlert(TARGET, [row("ok", 0)])).toBeNull();
  });
});

describe("formatCanaryAlertEmail", () => {
  const failureAlert: CanaryAlert = {
    type: "failure",
    toolkit: "outlook",
    slug: "OUTLOOK_GET_MESSAGE",
    streak: 2,
    firstSeenAt: "2026-08-30T03:00:00.000Z",
    result: {
      kind: "slug_canary",
      target: "OUTLOOK_GET_MESSAGE",
      toolkit: "outlook",
      status: "failed",
      errorCode: "tool_not_found",
      errorMessage: "Tool_ToolNotFound",
      latencyMs: 718,
      checkedAt: CHECKED_AT,
    },
  };

  it("leads with the failure count and carries concrete evidence", () => {
    const { subject, lines } = formatCanaryAlertEmail([failureAlert]);
    expect(subject).toBe("[Salt ops] Composio canary: 1 slug failing");
    const body = lines.join("\n");
    expect(body).toContain("FAILING OUTLOOK_GET_MESSAGE (outlook)");
    expect(body).toContain("tool_not_found");
    expect(body).toContain("first seen: 2026-08-30T03:00:00.000Z");
  });

  it("uses a recovery subject when nothing is failing", () => {
    const { subject, lines } = formatCanaryAlertEmail([
      { ...failureAlert, type: "recovery" },
    ]);
    expect(subject).toBe("[Salt ops] Composio canary: 1 slug recovered");
    expect(lines.join("\n")).toContain("RECOVERED OUTLOOK_GET_MESSAGE");
  });
});

describe("runSlugCanary", () => {
  const inserted: CanaryResult[] = [];
  let historyByTarget: Record<string, CanaryHistoryRow[]>;

  const store: CanaryStore = {
    insertResults: async (rows) => {
      inserted.push(...rows);
    },
    recentHistory: async (target) => historyByTarget[target] ?? [],
  };

  beforeEach(() => {
    inserted.length = 0;
    historyByTarget = {};
  });

  it("probes every registry slug and writes one row each", async () => {
    const summary = await runSlugCanary({
      store,
      probe: async () => ({ inputParameters: { type: "object" } }),
      now: new Date(CHECKED_AT),
    });
    expect(inserted).toHaveLength(CANARY_SLUGS.length);
    expect(summary.results).toHaveLength(CANARY_SLUGS.length);
    expect(summary.failedCount).toBe(0);
    expect(summary.alerts).toEqual([]);
    expect(inserted[0]).toMatchObject({
      kind: "slug_canary",
      status: "ok",
      checkedAt: CHECKED_AT,
    });
  });

  it("returns a failure alert when stored history shows the streak crossing", async () => {
    const deadSlug = CANARY_SLUGS[0].slug;
    historyByTarget = {
      [deadSlug]: [
        { status: "failed", checked_at: "2026-08-30T03:00:00.000Z" },
        { status: "ok", checked_at: "2026-08-30T02:00:00.000Z" },
      ],
    };
    const summary = await runSlugCanary({
      store,
      probe: async (slug) => {
        if (slug === deadSlug) throw httpError(404, "Tool_ToolNotFound");
        return { inputParameters: { type: "object" } };
      },
      now: new Date(CHECKED_AT),
    });
    expect(summary.failedCount).toBe(1);
    expect(summary.alerts).toHaveLength(1);
    expect(summary.alerts[0]).toMatchObject({
      type: "failure",
      streak: ALERT_THRESHOLD,
      firstSeenAt: "2026-08-30T03:00:00.000Z",
    });
    expect(summary.alerts[0].result.errorCode).toBe("tool_not_found");
  });

  it("returns a recovery alert when a slug heals after an alerted streak", async () => {
    const healedSlug = CANARY_SLUGS[0].slug;
    historyByTarget = {
      [healedSlug]: [
        { status: "failed", checked_at: "2026-08-30T03:00:00.000Z" },
        { status: "failed", checked_at: "2026-08-30T02:00:00.000Z" },
      ],
    };
    const summary = await runSlugCanary({
      store,
      probe: async () => ({ inputParameters: { type: "object" } }),
      now: new Date(CHECKED_AT),
    });
    expect(summary.failedCount).toBe(0);
    expect(summary.alerts).toHaveLength(1);
    expect(summary.alerts[0]).toMatchObject({ type: "recovery", streak: 2 });
  });
});
