import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "run-123" }, error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock("./schema/v2/discovery", () => ({
  discoverV2Playbooks: vi.fn(() => ({ sections: new Map(), allPlaybooks: [], errors: [] })),
  getPlaybookBySlug: vi.fn(() => null),
}));

import {
  buildSignalTriggerIndex,
  findPlaybooksForSignal,
  getActiveSignalTriggers,
  hasPlaybookForSignal,
} from "./trigger-dispatch";
import { discoverV2Playbooks } from "./schema/v2/discovery";
import type { PlaybookDefinitionV2 } from "./schema/v2/types";

const mockDiscoverV2Playbooks = discoverV2Playbooks as ReturnType<typeof vi.fn>;

function makeV2Playbook(
  slug: string,
  signalKey: string,
  layer: "learn" | "act" = "act",
): { definition: PlaybookDefinitionV2; hasScript: boolean; hasPlaybookMd: boolean; packagePath: string } {
  return {
    definition: {
      name: `Test ${slug}`,
      slug,
      version: "1.0.0",
      description: "Test playbook",
      section: "relationships",
      layer,
      trigger: { type: "signal", signal: signalKey },
      steps: [],
      output: { type: "notification" },
    },
    hasScript: false,
    hasPlaybookMd: true,
    packagePath: `/test/playbooks/${slug}`,
  };
}

describe("Trigger Dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildSignalTriggerIndex", () => {
    it("builds index from v2 playbooks with signal triggers", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [
          makeV2Playbook("follow-up-after-payment", "has_payment_received"),
          makeV2Playbook("meeting-prep", "has_calendar_meeting"),
        ],
        errors: [],
      });

      const index = buildSignalTriggerIndex();

      expect(index.size).toBe(2);
      expect(index.get("has_payment_received")).toHaveLength(1);
      expect(index.get("has_calendar_meeting")).toHaveLength(1);
    });

    it("groups multiple playbooks for the same signal", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [
          makeV2Playbook("follow-up-1", "has_payment_received"),
          makeV2Playbook("follow-up-2", "has_payment_received"),
        ],
        errors: [],
      });

      const index = buildSignalTriggerIndex();

      expect(index.get("has_payment_received")).toHaveLength(2);
    });

    it("ignores playbooks with invalid signal keys", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [
          makeV2Playbook("valid", "has_payment_received"),
          makeV2Playbook("invalid", "not_a_real_signal"),
        ],
        errors: [],
      });

      const index = buildSignalTriggerIndex();

      expect(index.size).toBe(1);
      expect(index.has("not_a_real_signal")).toBe(false);
    });

    it("ignores playbooks with non-signal triggers", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [
          {
            ...makeV2Playbook("chat-only", "has_payment_received"),
            definition: {
              ...makeV2Playbook("chat-only", "has_payment_received").definition,
              trigger: { type: "chat" as const },
            },
          },
          {
            ...makeV2Playbook("manual-only", "has_payment_received"),
            definition: {
              ...makeV2Playbook("manual-only", "has_payment_received").definition,
              trigger: { type: "manual" as const },
            },
          },
        ],
        errors: [],
      });

      const index = buildSignalTriggerIndex();

      expect(index.size).toBe(0);
    });
  });

  describe("findPlaybooksForSignal", () => {
    it("returns matching playbooks", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [makeV2Playbook("payment-followup", "has_payment_received")],
        errors: [],
      });

      const playbooks = findPlaybooksForSignal("has_payment_received");

      expect(playbooks).toHaveLength(1);
      expect(playbooks[0].slug).toBe("payment-followup");
    });

    it("returns empty array for unknown signals", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [makeV2Playbook("payment-followup", "has_payment_received")],
        errors: [],
      });

      const playbooks = findPlaybooksForSignal("unknown_signal");

      expect(playbooks).toHaveLength(0);
    });
  });

  describe("getActiveSignalTriggers", () => {
    it("returns all signal keys with playbook triggers", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [
          makeV2Playbook("a", "has_payment_received"),
          makeV2Playbook("b", "has_calendar_meeting"),
          makeV2Playbook("c", "has_payment_received"),
        ],
        errors: [],
      });

      const signals = getActiveSignalTriggers();

      expect(signals).toHaveLength(2);
      expect(signals).toContain("has_payment_received");
      expect(signals).toContain("has_calendar_meeting");
    });
  });

  describe("hasPlaybookForSignal", () => {
    it("returns true when playbook exists for signal", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [makeV2Playbook("payment-followup", "has_payment_received")],
        errors: [],
      });

      expect(hasPlaybookForSignal("has_payment_received")).toBe(true);
    });

    it("returns false when no playbook exists for signal", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [makeV2Playbook("payment-followup", "has_payment_received")],
        errors: [],
      });

      expect(hasPlaybookForSignal("has_calendar_meeting")).toBe(false);
    });
  });

  describe("layer handling", () => {
    it("indexes learn-layer playbooks with signal triggers", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [
          makeV2Playbook("memory-entity-notes", "capture_email_received", "learn"),
          makeV2Playbook("meeting-follow-up", "meeting_end_passed", "act"),
        ],
        errors: [],
      });

      const index = buildSignalTriggerIndex();

      expect(index.get("capture_email_received")).toHaveLength(1);
      expect(index.get("capture_email_received")?.[0].layer).toBe("learn");
      expect(index.get("meeting_end_passed")).toHaveLength(1);
      expect(index.get("meeting_end_passed")?.[0].layer).toBe("act");
    });

    it("finds both learn and act playbooks for signals", () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [
          makeV2Playbook("memory-notes", "has_payment_received", "learn"),
          makeV2Playbook("payment-followup", "has_payment_received", "act"),
        ],
        errors: [],
      });

      const playbooks = findPlaybooksForSignal("has_payment_received");

      expect(playbooks).toHaveLength(2);
      expect(playbooks.map((p) => p.layer).sort()).toEqual(["act", "learn"]);
    });
  });
});
