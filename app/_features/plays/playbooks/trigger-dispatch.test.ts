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

vi.mock("./load-authored-playbook-blueprints", () => ({
  loadAuthoredPlaybookBlueprintRows: vi.fn(() => []),
}));

import {
  buildSignalTriggerIndex,
  findPlaybooksForSignal,
  getActiveSignalTriggers,
  hasPlaybookForSignal,
} from "./trigger-dispatch";
import { loadAuthoredPlaybookBlueprintRows } from "./load-authored-playbook-blueprints";
import type { PlaybookBlueprintRow } from "./types";

const mockLoadBlueprints = loadAuthoredPlaybookBlueprintRows as ReturnType<typeof vi.fn>;

function makeBlueprint(
  slug: string,
  signalKey: string,
  kind: "acting" | "profile" = "acting",
): PlaybookBlueprintRow {
  return {
    slug,
    name: `Test ${slug}`,
    kind,
    player_slug: "follow-up",
    description: "Test playbook",
    when_to_use: "When testing",
    trigger: { type: "signal", signal: signalKey },
    procedure_md: "# Test",
    definition: { version: 1 as const, steps: [] },
    fill_rules: null,
    required_actions: [],
    required_toolkits: [],
    value_model: null,
    version: 1,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    workspace_id: null,
    origin: "salt",
  };
}

describe("Trigger Dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildSignalTriggerIndex", () => {
    it("builds index from blueprints with signal triggers", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("follow-up-after-payment", "has_payment_received"),
        makeBlueprint("meeting-prep", "has_calendar_meeting"),
      ]);

      const index = buildSignalTriggerIndex();

      expect(index.size).toBe(2);
      expect(index.get("has_payment_received")).toHaveLength(1);
      expect(index.get("has_calendar_meeting")).toHaveLength(1);
    });

    it("groups multiple playbooks for the same signal", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("follow-up-1", "has_payment_received"),
        makeBlueprint("follow-up-2", "has_payment_received"),
      ]);

      const index = buildSignalTriggerIndex();

      expect(index.get("has_payment_received")).toHaveLength(2);
    });

    it("ignores playbooks with invalid signal keys", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("valid", "has_payment_received"),
        makeBlueprint("invalid", "not_a_real_signal"),
      ]);

      const index = buildSignalTriggerIndex();

      expect(index.size).toBe(1);
      expect(index.has("not_a_real_signal")).toBe(false);
    });

    it("ignores playbooks with non-signal triggers", () => {
      mockLoadBlueprints.mockReturnValue([
        {
          ...makeBlueprint("chat-only", "has_payment_received"),
          trigger: { type: "chat" },
        },
        {
          ...makeBlueprint("manual-only", "has_payment_received"),
          trigger: { type: "manual" },
        },
      ]);

      const index = buildSignalTriggerIndex();

      expect(index.size).toBe(0);
    });
  });

  describe("findPlaybooksForSignal", () => {
    it("returns matching playbooks", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("payment-followup", "has_payment_received"),
      ]);

      const playbooks = findPlaybooksForSignal("has_payment_received");

      expect(playbooks).toHaveLength(1);
      expect(playbooks[0].slug).toBe("payment-followup");
    });

    it("returns empty array for unknown signals", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("payment-followup", "has_payment_received"),
      ]);

      const playbooks = findPlaybooksForSignal("unknown_signal");

      expect(playbooks).toHaveLength(0);
    });
  });

  describe("getActiveSignalTriggers", () => {
    it("returns all signal keys with playbook triggers", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("a", "has_payment_received"),
        makeBlueprint("b", "has_calendar_meeting"),
        makeBlueprint("c", "has_payment_received"),
      ]);

      const signals = getActiveSignalTriggers();

      expect(signals).toHaveLength(2);
      expect(signals).toContain("has_payment_received");
      expect(signals).toContain("has_calendar_meeting");
    });
  });

  describe("hasPlaybookForSignal", () => {
    it("returns true when playbook exists for signal", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("payment-followup", "has_payment_received"),
      ]);

      expect(hasPlaybookForSignal("has_payment_received")).toBe(true);
    });

    it("returns false when no playbook exists for signal", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("payment-followup", "has_payment_received"),
      ]);

      expect(hasPlaybookForSignal("has_calendar_meeting")).toBe(false);
    });
  });

  describe("keeper playbook integration", () => {
    it("indexes profile/keeper playbooks with signal triggers", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("keeper-entity-notes", "entity_learning_extracted", "profile"),
        makeBlueprint("meeting-follow-up", "meeting_end_passed", "acting"),
      ]);

      const index = buildSignalTriggerIndex();

      expect(index.get("entity_learning_extracted")).toHaveLength(1);
      expect(index.get("entity_learning_extracted")?.[0].kind).toBe("profile");
      expect(index.get("meeting_end_passed")).toHaveLength(1);
      expect(index.get("meeting_end_passed")?.[0].kind).toBe("acting");
    });

    it("finds both keeper and acting playbooks for signals", () => {
      mockLoadBlueprints.mockReturnValue([
        makeBlueprint("keeper-notes", "has_payment_received", "profile"),
        makeBlueprint("payment-followup", "has_payment_received", "acting"),
      ]);

      const playbooks = findPlaybooksForSignal("has_payment_received");

      expect(playbooks).toHaveLength(2);
      expect(playbooks.map((p) => p.kind).sort()).toEqual(["acting", "profile"]);
    });
  });
});
