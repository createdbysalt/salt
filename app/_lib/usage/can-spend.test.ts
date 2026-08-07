import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getWorkspaceEntitlement = vi.fn();
const getWorkspaceCogs = vi.fn();

vi.mock("./entitlements", () => ({
  getWorkspaceEntitlement: (...args: unknown[]) => getWorkspaceEntitlement(...args),
}));

vi.mock("./cogs", () => ({
  getWorkspaceCogs: (...args: unknown[]) => getWorkspaceCogs(...args),
}));

import { canSpend, resolveOutcome, resolveRevenueMicros, SPEND_THRESHOLDS } from "./can-spend";
import type { WorkspaceEntitlement, WorkspaceTier } from "./types";

function entitlement(overrides: Partial<WorkspaceEntitlement> = {}): WorkspaceEntitlement {
  return {
    workspaceId: "ws-1",
    tier: "starter" as WorkspaceTier,
    pricingVersion: "2026-08",
    status: "active",
    billingInterval: "month",
    playsIncluded: 25,
    playsUsed: 0,
    playsRemaining: 25,
    overageEnabled: false,
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: null,
    ...overrides,
  };
}

/** Starter is $29/mo. 2900 cents x 10,000 micros per cent. */
const STARTER_REVENUE_MICROS = 29_000_000;

describe("resolveOutcome", () => {
  it("allows spend while the workspace is comfortably profitable", () => {
    expect(resolveOutcome(0, "user")).toBe("allow");
    expect(resolveOutcome(0.29, "user")).toBe("allow");
  });

  it("starts degrading exactly at the threshold, not past it", () => {
    // A ratio landing precisely on the boundary must degrade. Using `>` here
    // instead of `>=` would leave a workspace sitting exactly at the margin
    // floor on the full-price path indefinitely.
    expect(resolveOutcome(SPEND_THRESHOLDS.degradeRatio, "user")).toBe("degrade");
  });

  it("degrades rather than blocks through the whole middle band", () => {
    expect(resolveOutcome(0.5, "user")).toBe("degrade");
    expect(resolveOutcome(0.99, "user")).toBe("degrade");
    expect(resolveOutcome(0.99, "background")).toBe("degrade");
    expect(resolveOutcome(0.99, "committed")).toBe("degrade");
  });

  it("splits by origin once the workspace costs more than it pays", () => {
    const over = SPEND_THRESHOLDS.denyRatio;

    // A user is present and can be told why, so refusal is honest.
    expect(resolveOutcome(over, "user")).toBe("deny");
    // Nobody asked for this; deferring is invisible where an error is not.
    expect(resolveOutcome(over, "background")).toBe("queue");
    // Already promised. Refusing strands a half-finished action.
    expect(resolveOutcome(over, "committed")).toBe("degrade");
  });

  it("never blocks committed work no matter how far over budget", () => {
    expect(resolveOutcome(50, "committed")).toBe("degrade");
  });
});

describe("resolveRevenueMicros", () => {
  it("converts the monthly subscription price to micro-USD", () => {
    expect(resolveRevenueMicros(entitlement())).toBe(STARTER_REVENUE_MICROS);
  });

  it("reduces an annual plan to its monthly equivalent", () => {
    // Starter annual is $290, which is ~$24.17/mo — less than the monthly
    // price. Comparing a month of cost against a year of revenue would give
    // annual subscribers twelve times the budget they are entitled to.
    const annual = resolveRevenueMicros(entitlement({ billingInterval: "year" }));
    expect(annual).toBeLessThan(STARTER_REVENUE_MICROS);
    expect(annual).toBe(Math.round(29_000 / 12) * 10_000);
  });

  it("returns null for a tier the catalog does not price", () => {
    // Enterprise is negotiated per deal and carries 0 in the catalog. Treating
    // that as real revenue makes every ratio infinite and denies the account
    // on its first request.
    expect(resolveRevenueMicros(entitlement({ tier: "enterprise" }))).toBeNull();
  });

  it("ignores play overage when the workspace has not opted in", () => {
    const value = resolveRevenueMicros(entitlement({ playsUsed: 100, overageEnabled: false }));
    expect(value).toBe(STARTER_REVENUE_MICROS);
  });

  it("counts opted-in overage as revenue, because the customer is paying it", () => {
    const value = resolveRevenueMicros(entitlement({ playsUsed: 35, overageEnabled: true }));
    // 10 plays past the bundle at 75c each.
    expect(value).toBe(STARTER_REVENUE_MICROS + 10 * 75 * 10_000);
  });

  it("caps overage revenue at the price of the next tier up (G5)", () => {
    // 1000 plays over would be $750 of overage, but overage can never bill
    // past the Pro/Starter delta. Counting the uncapped figure would inflate
    // the denominator and hand a runaway workspace an unlimited budget.
    const value = resolveRevenueMicros(entitlement({ playsUsed: 1025, overageEnabled: true }));
    const proMinusStarter = 7900 - 2900;
    expect(value).toBe(STARTER_REVENUE_MICROS + proMinusStarter * 10_000);
  });
});

describe("canSpend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspaceEntitlement.mockResolvedValue(entitlement());
    getWorkspaceCogs.mockResolvedValue({ micros: 0, known: true });
  });

  it("allows a workspace well inside its margin", async () => {
    getWorkspaceCogs.mockResolvedValue({ micros: 1_000_000, known: true });

    const decision = await canSpend({
      workspaceId: "ws-1",
      kind: "llm_tokens",
      origin: "user",
    });

    expect(decision.outcome).toBe("allow");
    expect(decision.userMessage).toBeNull();
  });

  it("denies a user-initiated call once COGS passes revenue", async () => {
    getWorkspaceCogs.mockResolvedValue({
      micros: STARTER_REVENUE_MICROS + 1,
      known: true,
    });

    const decision = await canSpend({
      workspaceId: "ws-1",
      kind: "llm_tokens",
      origin: "user",
    });

    expect(decision.outcome).toBe("deny");
    expect(decision.userMessage).toContain("Upgrade");
  });

  it("counts the forward estimate, so one large spend is caught before it lands", async () => {
    // Just under the line on recorded spend alone.
    getWorkspaceCogs.mockResolvedValue({
      micros: STARTER_REVENUE_MICROS - 1_000,
      known: true,
    });

    const withoutEstimate = await canSpend({
      workspaceId: "ws-1",
      kind: "tts",
      origin: "user",
    });
    expect(withoutEstimate.outcome).toBe("degrade");

    const withEstimate = await canSpend({
      workspaceId: "ws-1",
      kind: "tts",
      origin: "user",
      estimateMicros: 5_000,
    });
    expect(withEstimate.outcome).toBe("deny");
  });

  it("allows when the ledger cannot be read, rather than blocking on telemetry", async () => {
    getWorkspaceCogs.mockResolvedValue({ micros: 0, known: false });

    const decision = await canSpend({
      workspaceId: "ws-1",
      kind: "llm_tokens",
      origin: "user",
    });

    expect(decision.outcome).toBe("allow");
    expect(decision.reason).toContain("ledger unavailable");
  });

  it("allows when entitlement resolution throws", async () => {
    // A bug in billing code must not become an outage in customer features.
    getWorkspaceEntitlement.mockRejectedValue(new Error("boom"));

    const decision = await canSpend({
      workspaceId: "ws-1",
      kind: "llm_tokens",
      origin: "user",
    });

    expect(decision.outcome).toBe("allow");
  });

  it("does not query the ledger for a tier with no revenue basis", async () => {
    getWorkspaceEntitlement.mockResolvedValue(entitlement({ tier: "enterprise" }));

    const decision = await canSpend({
      workspaceId: "ws-1",
      kind: "composio_action",
      origin: "user",
    });

    expect(decision.outcome).toBe("allow");
    expect(getWorkspaceCogs).not.toHaveBeenCalled();
  });

  it("reuses a caller-supplied entitlement instead of re-resolving it", async () => {
    await canSpend({
      workspaceId: "ws-1",
      kind: "llm_tokens",
      origin: "user",
      entitlement: entitlement(),
    });

    expect(getWorkspaceEntitlement).not.toHaveBeenCalled();
  });

  it("scopes the COGS window to the workspace's billing period", async () => {
    getWorkspaceEntitlement.mockResolvedValue(
      entitlement({
        periodStart: "2026-07-15T00:00:00.000Z",
        periodEnd: "2026-08-15T00:00:00.000Z",
      })
    );

    await canSpend({ workspaceId: "ws-1", kind: "llm_tokens", origin: "user" });

    expect(getWorkspaceCogs).toHaveBeenCalledWith(
      "ws-1",
      "2026-07-15T00:00:00.000Z",
      "2026-08-15T00:00:00.000Z",
      expect.any(Number)
    );
  });
});
