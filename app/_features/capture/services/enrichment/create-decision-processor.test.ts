import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Chain A (capture enrichment CREATE decisions) — plays canon Phase 2.
 *
 * CREATE-tier decisions never touch play_runs — proposals route through
 * routeIntakeProposal, which applies the P6 (calibration) + P7
 * (relationship-grade worthiness) contract: direct record creation only when
 * both pass, otherwise pending_evidence status='suggested' for the
 * Memory → Filter Watching lane.
 */

const h = vi.hoisted(() => ({
  routeIntakeProposal: vi.fn(),
  shouldAutoApply: vi.fn(),
  recordDecisionOutcome: vi.fn(),
  updateCalibrationSnapshot: vi.fn(),
}));

vi.mock("@/app/_features/memory/evidence/route-intake-proposal", () => ({
  routeIntakeProposal: h.routeIntakeProposal,
}));

vi.mock("../intelligence/record-capture-outcome", () => ({
  shouldAutoApply: h.shouldAutoApply,
  recordDecisionOutcome: h.recordDecisionOutcome,
  updateCalibrationSnapshot: h.updateCalibrationSnapshot,
}));

import { processCreateDecision } from "./create-decision-processor";
import type { CreateDecision } from "./record-capture-criteria";

function makeDecision(overrides?: Partial<CreateDecision>): CreateDecision {
  return {
    tier: "create",
    proposals: [
      {
        surface: "people",
        action: "create",
        hint: { name: "Jane Doe", domain: "acme.com" },
        confidence: 90,
        reason: "Bidirectional email thread - ongoing conversation",
        system_play: "system:create-person",
      },
    ],
    confidence: 90,
    reason: "Bidirectional thread - confirmed relationship",
    ...overrides,
  };
}

const baseInput = {
  workspaceId: "ws-1",
  captureEventId: "cap-1",
  decisionId: "dec-1",
  senderEmail: "jane@acme.com",
  senderName: "Jane Doe",
  senderDomain: "acme.com",
};

beforeEach(() => {
  h.routeIntakeProposal.mockReset();
  h.shouldAutoApply.mockReset();
  h.recordDecisionOutcome.mockReset();
  h.updateCalibrationSnapshot.mockReset();

  h.routeIntakeProposal.mockResolvedValue({
    outcome: "suggested",
    evidenceId: "ev-1",
  });
  h.shouldAutoApply.mockResolvedValue(false);
  h.recordDecisionOutcome.mockResolvedValue(undefined);
  h.updateCalibrationSnapshot.mockResolvedValue(undefined);
});

describe("processCreateDecision", () => {
  it("uncalibrated: routes to the suggested lane — no record created", async () => {
    h.shouldAutoApply.mockResolvedValue(false);

    const result = await processCreateDecision({
      ...baseInput,
      decision: makeDecision(),
    });

    expect(h.routeIntakeProposal).toHaveBeenCalledTimes(1);
    expect(h.routeIntakeProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        entityType: "person",
        identifier: "jane@acme.com",
        confidence: 90,
        captureId: "cap-1",
        signals: [],
        autoApply: false,
      })
    );
    expect(h.recordDecisionOutcome).not.toHaveBeenCalled();
    expect(h.updateCalibrationSnapshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      autoApplied: false,
      createdRecordId: null,
    });
  });

  it("calibrated + relationship-grade signals: record created directly", async () => {
    h.shouldAutoApply.mockResolvedValue(true);
    h.routeIntakeProposal.mockResolvedValue({
      outcome: "created",
      evidenceId: "ev-1",
      recordId: "rec-9",
    });

    const result = await processCreateDecision({
      ...baseInput,
      decision: makeDecision(),
      signals: ["payment_notification_email"],
    });

    expect(h.routeIntakeProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        autoApply: true,
        signals: ["payment_notification_email"],
      })
    );
    expect(h.recordDecisionOutcome).toHaveBeenCalledWith(
      "dec-1",
      "auto_applied",
      undefined,
      "rec-9"
    );
    expect(h.updateCalibrationSnapshot).toHaveBeenCalledWith("ws-1");
    expect(result).toEqual({
      autoApplied: true,
      createdRecordId: "rec-9",
    });
  });

  it("maps org proposals to the organization entity type", async () => {
    await processCreateDecision({
      ...baseInput,
      senderEmail: null,
      decision: makeDecision({
        proposals: [
          {
            surface: "orgs",
            action: "create",
            hint: { domain: "acme.com" },
            confidence: 80,
            reason: "Business domain from bidirectional thread",
            system_play: "system:create-org",
          },
        ],
      }),
    });

    expect(h.routeIntakeProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "organization",
        identifier: "acme.com",
      })
    );
  });

  it("no proposals: returns without routing anything", async () => {
    const result = await processCreateDecision({
      ...baseInput,
      decision: makeDecision({ proposals: [] }),
    });

    expect(h.routeIntakeProposal).not.toHaveBeenCalled();
    expect(h.recordDecisionOutcome).not.toHaveBeenCalled();
    expect(result).toEqual({
      autoApplied: false,
      createdRecordId: null,
    });
  });
});
