import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: table === "correction_events" ? [] : null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { memory_care_auto_apply_threshold: 85 },
      }),
    })),
  })),
}));

vi.mock("@/app/_lib/learning", () => ({
  accumulateEvidence: vi.fn(async () => ({
    evidenceId: "ev-1",
    aggregatedConfidence: 90,
  })),
  getAggregatedConfidence: vi.fn(async () => ({
    evidenceIds: ["ev-1"],
    aggregatedConfidence: 90,
    sourceTypeCount: 1,
    evidenceCount: 1,
  })),
  resolveEvidence: vi.fn(async () => undefined),
}));

vi.mock("@/app/_features/me/actions/salt-learnings", () => ({
  generateEvidenceSummary: vi.fn(async () => "1 signal"),
  recordSaltLearning: vi.fn(async () => ({ id: "learn-1" })),
}));

vi.mock("./settings", () => ({
  getCareThreshold: vi.fn(async () => 85),
}));

vi.mock("./reflection", () => ({
  getSignalSourceWeight: vi.fn(async () => 1.0),
}));

vi.mock("@/app/_lib/learning/correction-blocklist", () => ({
  getCorrectionBlocklist: vi.fn(async () => []),
  findBlockingCorrection: vi.fn(() => null),
}));

import { accumulateEvidence, resolveEvidence } from "@/app/_lib/learning";
import {
  findBlockingCorrection,
  getCorrectionBlocklist,
} from "@/app/_lib/learning/correction-blocklist";
import { recordSaltLearning } from "@/app/_features/me/actions/salt-learnings";
import { getCareThreshold } from "./settings";
import { getSignalSourceWeight } from "./reflection";
import { getCareFieldBar, processCareProposal } from "./decision-pipeline";

describe("decision-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCareThreshold).mockResolvedValue(85);
    vi.mocked(accumulateEvidence).mockResolvedValue({
      evidenceId: "ev-1",
      aggregatedConfidence: 90,
    } as never);
  });

  describe("getCareFieldBar", () => {
    it("returns infinity for never-touch fields", async () => {
      const bar = await getCareFieldBar("ws-1", "billing", "total");
      expect(bar.tier).toBe("never_touch");
      expect(bar.bar).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns 0 for always-auto fields", async () => {
      const bar = await getCareFieldBar("ws-1", "person", "email");
      expect(bar.alwaysAuto).toBe(true);
      expect(bar.bar).toBe(0);
    });

    it("raises sensitive fields to 95", async () => {
      const bar = await getCareFieldBar(
        "ws-1",
        "person",
        "relationship_type",
        "client"
      );
      expect(bar.tier).toBe("sensitive");
      expect(bar.bar).toBe(95);
    });
  });

  describe("processCareProposal", () => {
    it("refuses previously corrected values without accumulating or surfacing", async () => {
      vi.mocked(findBlockingCorrection).mockReturnValueOnce({
        id: "corr-9",
        fieldPath: "location",
        wrongValue: "Toronto",
        reason: "never_true",
        createdAt: "2026-08-01T00:00:00Z",
      });

      const decision = await processCareProposal({
        workspaceId: "ws-1",
        capability: "records",
        entityType: "person",
        entityId: "p-1",
        field: "location",
        proposedValue: "Toronto",
        confidence: 99,
        because: "email signature",
        evidenceType: "behavioral_signal",
        sourceType: "care",
      });

      expect(decision.action).toBe("refuse");
      expect(decision.correctionGuardTriggered).toBe(true);
      // The whole point: no evidence row, so nothing re-surfaces in Watching.
      expect(accumulateEvidence).not.toHaveBeenCalled();
      expect(getCorrectionBlocklist).toHaveBeenCalledWith(
        "ws-1",
        "person",
        "p-1",
        "location"
      );
    });

    it("refuses never-touch without accumulating evidence", async () => {
      const decision = await processCareProposal({
        workspaceId: "ws-1",
        capability: "records",
        entityType: "billing",
        entityId: "bill-1",
        field: "total",
        proposedValue: "500",
        confidence: 99,
        because: "parsed invoice",
        evidenceType: "behavioral_signal",
        sourceType: "care",
      });

      expect(decision.action).toBe("refuse");
      expect(accumulateEvidence).not.toHaveBeenCalled();
    });

    it("applies when confidence clears the standard bar", async () => {
      const decision = await processCareProposal({
        workspaceId: "ws-1",
        capability: "records",
        entityType: "person",
        entityId: "p-1",
        entityLabel: "Lisa",
        field: "location",
        proposedValue: "Toronto",
        confidence: 90,
        because: "email signature",
        evidenceType: "behavioral_signal",
        sourceType: "care",
      });

      expect(decision.action).toBe("apply");
      expect(recordSaltLearning).toHaveBeenCalled();
      expect(resolveEvidence).toHaveBeenCalled();
    });

    it("watches when below the bar", async () => {
      vi.mocked(accumulateEvidence).mockResolvedValue({
        evidenceId: "ev-2",
        aggregatedConfidence: 60,
      } as never);

      const decision = await processCareProposal({
        workspaceId: "ws-1",
        capability: "records",
        entityType: "person",
        entityId: "p-1",
        field: "location",
        proposedValue: "Toronto",
        confidence: 60,
        because: "weak signal",
        evidenceType: "behavioral_signal",
        sourceType: "care",
      });

      expect(decision.action).toBe("watch");
      expect(recordSaltLearning).not.toHaveBeenCalled();
    });

    it("holds sensitive fields to the elevated bar", async () => {
      vi.mocked(accumulateEvidence).mockResolvedValue({
        evidenceId: "ev-3",
        aggregatedConfidence: 90,
      } as never);

      const decision = await processCareProposal({
        workspaceId: "ws-1",
        capability: "records",
        entityType: "person",
        entityId: "p-1",
        field: "relationship_type",
        proposedValue: "client",
        confidence: 90,
        because: "invoice sent",
        evidenceType: "behavioral_signal",
        sourceType: "care",
      });

      expect(decision.action).toBe("watch");
      expect(decision.bar).toBe(95);
    });

    describe("P8 signal source weight adjustment", () => {
      it("applies weight to reduce effective confidence", async () => {
        vi.mocked(accumulateEvidence).mockResolvedValue({
          evidenceId: "ev-weight",
          aggregatedConfidence: 90,
        } as never);
        vi.mocked(getSignalSourceWeight).mockResolvedValue(0.7);

        const decision = await processCareProposal({
          workspaceId: "ws-1",
          capability: "records",
          entityType: "person",
          entityId: "p-1",
          field: "industry",
          proposedValue: "Technology",
          confidence: 90,
          because: "email signature",
          evidenceType: "llm_inference",
          sourceType: "email_signature",
        });

        // 90 * 0.7 = 63, which is below the 85 bar
        expect(decision.action).toBe("watch");
        expect(decision.aggregatedConfidence).toBe(63);
        expect(getSignalSourceWeight).toHaveBeenCalledWith(
          "ws-1",
          "email_signature",
          "industry"
        );
      });

      it("does not reduce confidence when weight is 1.0", async () => {
        vi.mocked(accumulateEvidence).mockResolvedValue({
          evidenceId: "ev-full",
          aggregatedConfidence: 90,
        } as never);
        vi.mocked(getSignalSourceWeight).mockResolvedValue(1.0);

        const decision = await processCareProposal({
          workspaceId: "ws-1",
          capability: "records",
          entityType: "person",
          entityId: "p-1",
          field: "location",
          proposedValue: "NYC",
          confidence: 90,
          because: "calendar event",
          evidenceType: "behavioral_signal",
          sourceType: "calendar",
        });

        expect(decision.action).toBe("apply");
        expect(decision.aggregatedConfidence).toBe(90);
      });

      it("weight floor of 0.5 still allows high-confidence proposals through", async () => {
        vi.mocked(accumulateEvidence).mockResolvedValue({
          evidenceId: "ev-floor",
          aggregatedConfidence: 100,
        } as never);
        vi.mocked(getSignalSourceWeight).mockResolvedValue(0.5);

        const decision = await processCareProposal({
          workspaceId: "ws-1",
          capability: "records",
          entityType: "person",
          entityId: "p-1",
          field: "company_name",
          proposedValue: "Acme",
          confidence: 100,
          because: "explicit statement",
          evidenceType: "explicit_mention",
          sourceType: "unreliable_source",
        });

        // 100 * 0.5 = 50, below 85 bar
        expect(decision.action).toBe("watch");
        expect(decision.aggregatedConfidence).toBe(50);
      });
    });
  });
});
