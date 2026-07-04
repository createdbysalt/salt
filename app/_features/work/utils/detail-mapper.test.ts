import { describe, expect, it } from "vitest";
import { toWorkDetailViewModel } from "./detail-mapper";
import type { WorkDetailSummary } from "../types";

const baseSummary: WorkDetailSummary = {
  id: "work-1",
  name: "Brand refresh — Acme Co",
  slug: "brand-refresh-acme-co",
  status: "active",
  description: "Website redesign and brand system refresh.",
  workType: "project",
  stage: "active",
  org: { id: "org-1", name: "Acme Co" },
  people: [],
  service: null,
  serviceId: null,
  contractValueCents: null,
  paymentType: null,
  paymentTerms: "net_30",
  currency: "USD",
  hourlyRateCents: null,
  hoursEstimate: null,
  retainerMrrCents: null,
  renewalDate: null,
  billingCycle: null,
  billingContactId: null,
  poNumber: null,
  estimatedTimeline: null,
  discountPercent: null,
  discountAmountCents: null,
  discountReason: null,
  finalPriceCents: null,
  scopeItems: [],
  // Relative dates so the badge derivation doesn't flip Active→Stalled as
  // the suite ages (this fixture rotted once already with fixed dates).
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  stageEnteredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  progressOverride: null,
  healthScore: 78,
  healthBand: "Healthy",
  healthArchetype: "delivery",
  healthFactors: [{ factor: "Recent activity", impact: 0, reason: "Updated this week" }],
  healthUpdatedAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  createdAt: "2026-05-01T12:00:00.000Z",
  aiNarrative: null,
};

describe("toWorkDetailViewModel", () => {
  it("maps summary fields into the detail view model", () => {
    const viewModel = toWorkDetailViewModel({
      summary: baseSummary,
      connections: [{ id: "org-1", name: "Acme Co", type: "org" }],
    });

    expect(viewModel.id).toBe("work-1");
    expect(viewModel.title).toBe("Brand refresh — Acme Co");
    expect(viewModel.status).toBe("Active");
    expect(viewModel.progress).toBeGreaterThanOrEqual(20);
    expect(viewModel.progress).toBeLessThanOrEqual(90);
    expect(viewModel.health?.score).toBe(78);
    expect(viewModel.org).toEqual({ id: "org-1", name: "Acme Co" });
    expect(viewModel.description).toBe("Website redesign and brand system refresh.");
    expect(viewModel.connections).toHaveLength(1);
    expect(viewModel.summary).toBe("Website redesign and brand system refresh.");
  });

  it("falls back to a default summary when description is empty", () => {
    const viewModel = toWorkDetailViewModel({
      summary: { ...baseSummary, description: null },
      connections: [],
    });

    expect(viewModel.summary).toContain("Brand refresh — Acme Co is active with Acme Co.");
    expect(viewModel.summary).toContain("Health is good.");
    expect(viewModel.summary).not.toContain("in Memory");
  });

  it("includes archetype and label in health when available", () => {
    const viewModel = toWorkDetailViewModel({
      summary: { ...baseSummary, healthArchetype: "recurring" },
      connections: [],
    });

    expect(viewModel.health?.archetype).toBe("recurring");
    expect(viewModel.health?.label).toBe("Retainer health");
  });

  it("omits archetype fields when not available", () => {
    const viewModel = toWorkDetailViewModel({
      summary: { ...baseSummary, healthArchetype: null },
      connections: [],
    });

    expect(viewModel.health?.archetype).toBeUndefined();
    expect(viewModel.health?.label).toBeUndefined();
  });
});
