import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Per-table terminal results, reconfigurable per test. Any method call on the
// chain returns the chain again except single/maybeSingle which resolve.
const tableResults: Record<string, { data: unknown; error: unknown }> = {};

// Insert payloads per table, for skip-trace assertions.
const insertCalls: Array<{ table: string; payload: unknown }> = [];

function chainFor(table: string) {
  const terminal = () =>
    Promise.resolve(tableResults[table] ?? { data: null, error: null });
  // `single` gets its own bucket so tests can distinguish "lookup found
  // nothing" (maybeSingle) from "insert returned the new row" (single).
  const terminalSingle = () =>
    Promise.resolve(
      tableResults[`${table}:single`] ?? tableResults[table] ?? { data: null, error: null }
    );
  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") return undefined;
        if (prop === "maybeSingle") return terminal;
        if (prop === "single") return terminalSingle;
        return () => chain;
      },
    }
  ) as Record<string, unknown>;
  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => chainFor(table)),
      insert: vi.fn((payload: unknown) => {
        insertCalls.push({ table, payload });
        return chainFor(table);
      }),
      update: vi.fn(() => chainFor(table)),
    })),
  })),
}));

vi.mock("./schema/v2/discovery", () => ({
  discoverV2Playbooks: vi.fn(() => ({ sections: new Map(), allPlaybooks: [], errors: [] })),
  getPlaybookBySlug: vi.fn(() => null),
}));

vi.mock("./db-definitions", () => ({
  listWorkspacePlaybookDefinitions: vi.fn(async () => ({
    playbooks: [],
    errors: [],
  })),
}));

vi.mock("@/app/_features/plays/services/meter-play", () => ({
  meterInternalPlay: vi.fn(async () => undefined),
}));

vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: vi.fn(async () => []),
}));

vi.mock("./schema/v2/executor", () => ({
  buildExecutionContextV2: vi.fn(
    async (
      workspaceId: string,
      userId: string,
      triggeredBy: unknown
    ) => ({
      workspaceId,
      userId,
      triggeredBy,
      connectedCategories: new Set<string>(),
      connectedCapabilities: new Set<string>(),
    })
  ),
  executePlaybookV2: vi.fn(),
}));

vi.mock("@/app/_features/plays/services/workspace-actor", () => ({
  resolveWorkspaceActor: vi.fn(async () => "actor-user-1"),
}));

vi.mock("@/app/_features/plays/services/record-inline-executions", () => ({
  recordInlineToolExecutions: vi.fn(async () => null),
  collectExecutedToolSlugs: vi.fn(() => []),
}));

vi.mock("./run-recording", () => ({
  recordPlaybookRun: vi.fn(async () => undefined),
}));

import {
  buildSignalTriggerIndex,
  buildWorkspaceRecordConditionIndex,
  buildWorkspaceSignalTriggerIndex,
  dispatchRecordConditionTrigger,
  dispatchSignalTrigger,
  findPlaybooksForSignal,
  getActiveSignalTriggers,
  hasPlaybookForSignal,
} from "./trigger-dispatch";
import { discoverV2Playbooks, getPlaybookBySlug } from "./schema/v2/discovery";
import { listWorkspacePlaybookDefinitions } from "./db-definitions";
import { meterInternalPlay } from "@/app/_features/plays/services/meter-play";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "./schema/v2/executor";
import {
  recordInlineToolExecutions,
  collectExecutedToolSlugs,
} from "@/app/_features/plays/services/record-inline-executions";
import type {
  PlaybookDefinitionV2,
  PlaybookRecordConditionTrigger,
} from "./schema/v2/types";

const mockDiscoverV2Playbooks = discoverV2Playbooks as ReturnType<typeof vi.fn>;
const mockGetPlaybookBySlug = getPlaybookBySlug as ReturnType<typeof vi.fn>;
const mockListWorkspaceDefs = listWorkspacePlaybookDefinitions as ReturnType<typeof vi.fn>;
const mockMeterInternalPlay = meterInternalPlay as ReturnType<typeof vi.fn>;
const mockExecutePlaybookV2 = executePlaybookV2 as ReturnType<typeof vi.fn>;
const mockBuildContext = buildExecutionContextV2 as ReturnType<typeof vi.fn>;
const mockRecordInline = recordInlineToolExecutions as ReturnType<typeof vi.fn>;
const mockCollectToolSlugs = collectExecutedToolSlugs as ReturnType<typeof vi.fn>;

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
    insertCalls.length = 0;
    for (const key of Object.keys(tableResults)) delete tableResults[key];
    mockListWorkspaceDefs.mockResolvedValue({ playbooks: [], errors: [] });
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

  describe("dispatchSignalTrigger (act layer → executor)", () => {
    const signalContext = {
      workspaceId: "ws-1",
      signalKey: "has_payment_received",
      entityId: "person-1",
      entitySurface: "person" as const,
      entityLabel: "Anna",
    };

    function setupDispatch(options?: {
      surface?: string;
      recentRunId?: string | null;
    }) {
      const playbook = makeV2Playbook(
        "payment-followup",
        "has_payment_received"
      );
      if (options?.surface) {
        playbook.definition.trigger = {
          type: "signal",
          signal: "has_payment_received",
          surface: options.surface,
        };
      }
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [playbook],
        errors: [],
      });
      mockGetPlaybookBySlug.mockReturnValue(playbook);
      // Enabled by default (no settings row).
      tableResults["profile_playbook_settings"] = { data: null, error: null };
      tableResults["play_runs"] = {
        data: options?.recentRunId ? { id: options.recentRunId } : null,
        error: null,
      };
      return playbook;
    }

    it("runs the playbook through the v2 executor with entity context", async () => {
      setupDispatch();
      mockExecutePlaybookV2.mockResolvedValue({
        status: "paused",
        playbookSlug: "payment-followup",
        stepResults: [],
        pausedAt: { playRunId: "run-1" },
      });

      const results = await dispatchSignalTrigger(signalContext);

      expect(mockExecutePlaybookV2).toHaveBeenCalledTimes(1);
      expect(mockBuildContext).toHaveBeenCalledWith(
        "ws-1",
        "actor-user-1",
        expect.objectContaining({
          type: "signal",
          signalKey: "has_payment_received",
          entityId: "person-1",
          entitySurface: "person",
          entityLabel: "Anna",
        }),
        undefined,
        undefined,
        expect.any(String)
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        success: true,
        playbookSlug: "payment-followup",
        playRunId: "run-1",
      });
    });

    it("skips when a run for the same playbook + entity + signal exists within the cooldown", async () => {
      setupDispatch({ recentRunId: "run-recent" });

      const results = await dispatchSignalTrigger(signalContext);

      expect(mockExecutePlaybookV2).not.toHaveBeenCalled();
      expect(results[0]).toEqual({
        success: true,
        playbookSlug: "payment-followup",
        skipped: "cooldown",
      });
    });

    it("skips playbooks whose trigger surface does not match the entity surface", async () => {
      setupDispatch({ surface: "organization" });

      const results = await dispatchSignalTrigger(signalContext);

      expect(mockExecutePlaybookV2).not.toHaveBeenCalled();
      expect(results[0]).toEqual({
        success: true,
        playbookSlug: "payment-followup",
        skipped: "surface_mismatch",
      });
    });

    it("skips disabled playbooks without executing", async () => {
      setupDispatch();
      tableResults["profile_playbook_settings"] = {
        data: { enabled: false },
        error: null,
      };

      const results = await dispatchSignalTrigger(signalContext);

      expect(mockExecutePlaybookV2).not.toHaveBeenCalled();
      expect(results[0]).toEqual({
        success: false,
        playbookSlug: "payment-followup",
        skipped: "disabled",
      });
    });

    it("meters inline tool executions from completed runs", async () => {
      setupDispatch();
      mockExecutePlaybookV2.mockResolvedValue({
        status: "success",
        playbookSlug: "payment-followup",
        stepResults: [
          { stepId: "a", status: "success", data: { executed: true, tool: "T" } },
        ],
        outputCount: 1,
        playRunIds: ["run-9"],
      });
      mockCollectToolSlugs.mockReturnValue(["GMAIL_SEND_EMAIL"]);

      const results = await dispatchSignalTrigger(signalContext);

      expect(mockRecordInline).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          playbookSlug: "payment-followup",
          triggerSignal: "has_payment_received",
          toolSlugs: ["GMAIL_SEND_EMAIL"],
        })
      );
      expect(results[0].playRunId).toBe("run-9");
    });

    it("returns an error result when the executor reports failure", async () => {
      setupDispatch();
      mockExecutePlaybookV2.mockResolvedValue({
        status: "error",
        playbookSlug: "payment-followup",
        stepResults: [],
        reason: "fetch failed",
      });

      const results = await dispatchSignalTrigger(signalContext);

      expect(results[0]).toEqual({
        success: false,
        playbookSlug: "payment-followup",
        error: "fetch failed",
      });
    });
  });

  describe("workspace definition overlay (fork-on-edit)", () => {
    const signalContext = {
      workspaceId: "ws-1",
      signalKey: "has_payment_received",
      entityId: "person-1",
      entitySurface: "person" as const,
      entityLabel: "Anna",
    };

    function workspaceCopyOf(
      playbook: ReturnType<typeof makeV2Playbook>,
      trigger: PlaybookDefinitionV2["trigger"]
    ) {
      return {
        definition: { ...playbook.definition, trigger },
        sectionMeta: null,
        validationErrors: [],
      };
    }

    it("replaces the repo entry when a forked playbook changes its trigger", async () => {
      const repoPlaybook = makeV2Playbook(
        "payment-followup",
        "has_payment_received"
      );
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [repoPlaybook],
        errors: [],
      });
      // The workspace fork re-triggers the play on a different signal.
      mockListWorkspaceDefs.mockResolvedValue({
        playbooks: [
          workspaceCopyOf(repoPlaybook, {
            type: "signal",
            signal: "has_calendar_meeting",
          }),
        ],
        errors: [],
      });

      const index = await buildWorkspaceSignalTriggerIndex("ws-1");

      expect(index.get("has_payment_received") ?? []).toHaveLength(0);
      expect(index.get("has_calendar_meeting")).toHaveLength(1);
      expect(index.get("has_calendar_meeting")?.[0].slug).toBe(
        "payment-followup"
      );
    });

    it("adds workspace-authored (DB-only) playbooks to the index", async () => {
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [],
        errors: [],
      });
      mockListWorkspaceDefs.mockResolvedValue({
        playbooks: [
          {
            definition: {
              ...makeV2Playbook("my-own-play", "has_payment_received")
                .definition,
            },
            sectionMeta: null,
            validationErrors: [],
          },
        ],
        errors: [],
      });

      const index = await buildWorkspaceSignalTriggerIndex("ws-1");

      expect(index.get("has_payment_received")).toHaveLength(1);
      expect(index.get("has_payment_received")?.[0].slug).toBe("my-own-play");
    });

    it("executes the workspace copy (DB-first), not the repo definition", async () => {
      const repoPlaybook = makeV2Playbook(
        "payment-followup",
        "has_payment_received"
      );
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [repoPlaybook],
        errors: [],
      });
      const forked = {
        ...repoPlaybook.definition,
        description: "Workspace-edited version",
      };
      mockListWorkspaceDefs.mockResolvedValue({
        playbooks: [
          { definition: forked, sectionMeta: null, validationErrors: [] },
        ],
        errors: [],
      });
      tableResults["profile_playbook_settings"] = { data: null, error: null };
      tableResults["play_runs"] = { data: null, error: null };
      mockExecutePlaybookV2.mockResolvedValue({
        status: "paused",
        playbookSlug: "payment-followup",
        stepResults: [],
        pausedAt: { playRunId: "run-1" },
      });

      const results = await dispatchSignalTrigger(signalContext);

      expect(mockExecutePlaybookV2).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Workspace-edited version" }),
        expect.anything()
      );
      expect(results[0].playRunId).toBe("run-1");
    });
  });

  describe("quiet-skip traces", () => {
    const signalContext = {
      workspaceId: "ws-1",
      signalKey: "has_payment_received",
      entityId: "person-1",
      entitySurface: "person" as const,
      entityLabel: "Anna",
    };

    it("inserts an auto_handled play_runs row with skip_reason and meters it", async () => {
      const playbook = makeV2Playbook(
        "payment-followup",
        "has_payment_received"
      );
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [playbook],
        errors: [],
      });
      mockGetPlaybookBySlug.mockReturnValue(playbook);
      tableResults["profile_playbook_settings"] = { data: null, error: null };
      // No recent run (cooldown lookup uses maybeSingle)…
      tableResults["play_runs"] = { data: null, error: null };
      // …but the skip-trace insert (single) returns the new row id.
      tableResults["play_runs:single"] = {
        data: { id: "skip-run-1" },
        error: null,
      };
      mockExecutePlaybookV2.mockResolvedValue({
        status: "skipped",
        playbookSlug: "payment-followup",
        stepResults: [],
        reason: "Stripe already reminded",
      });

      const results = await dispatchSignalTrigger(signalContext);

      expect(results[0]).toEqual({
        success: true,
        playbookSlug: "payment-followup",
        skipped: "Stripe already reminded",
      });

      const skipInsert = insertCalls.find((c) => c.table === "play_runs");
      expect(skipInsert).toBeDefined();
      expect(skipInsert!.payload).toEqual(
        expect.objectContaining({
          workspace_id: "ws-1",
          state: "ran",
          queue: "auto_handled",
          trigger_source: "signal",
          metadata: { skip_reason: "Stripe already reminded" },
        })
      );
      expect(mockMeterInternalPlay).toHaveBeenCalledWith("ws-1", "skip-run-1");
    });

    it("does not insert a skip trace when the run produces outputs", async () => {
      const playbook = makeV2Playbook(
        "payment-followup",
        "has_payment_received"
      );
      mockDiscoverV2Playbooks.mockReturnValue({
        sections: new Map(),
        allPlaybooks: [playbook],
        errors: [],
      });
      mockGetPlaybookBySlug.mockReturnValue(playbook);
      tableResults["profile_playbook_settings"] = { data: null, error: null };
      tableResults["play_runs"] = { data: null, error: null };
      mockExecutePlaybookV2.mockResolvedValue({
        status: "paused",
        playbookSlug: "payment-followup",
        stepResults: [],
        pausedAt: { playRunId: "run-1" },
      });

      await dispatchSignalTrigger(signalContext);

      expect(
        insertCalls.filter((c) => c.table === "play_runs")
      ).toHaveLength(0);
      expect(mockMeterInternalPlay).not.toHaveBeenCalled();
    });
  });

  describe("record-condition triggers (Phase 5)", () => {
    const clientCondition: PlaybookRecordConditionTrigger = {
      type: "record_condition",
      entity: "person",
      field: "relationshipType",
      op: "eq",
      value: "client",
    };

    function makeConditionPlaybook(
      slug: string,
      trigger: PlaybookRecordConditionTrigger,
      layer: "learn" | "act" = "act"
    ) {
      const playbook = makeV2Playbook(slug, "has_payment_received", layer);
      playbook.definition.trigger = trigger;
      return playbook;
    }

    describe("buildWorkspaceRecordConditionIndex", () => {
      it("indexes repo record_condition triggers by canonical entity.field", async () => {
        mockDiscoverV2Playbooks.mockReturnValue({
          sections: new Map(),
          allPlaybooks: [makeConditionPlaybook("welcome-client", clientCondition)],
          errors: [],
        });

        const index = await buildWorkspaceRecordConditionIndex("ws-1");

        const matches = index.get("person.relationshipType") ?? [];
        expect(matches).toHaveLength(1);
        expect(matches[0].playbook.slug).toBe("welcome-client");
      });

      it("DB fork shadows the repo trigger", async () => {
        const repo = makeConditionPlaybook("welcome-client", clientCondition);
        mockDiscoverV2Playbooks.mockReturnValue({
          sections: new Map(),
          allPlaybooks: [repo],
          errors: [],
        });
        mockListWorkspaceDefs.mockResolvedValue({
          playbooks: [
            {
              definition: {
                ...repo.definition,
                trigger: {
                  type: "record_condition",
                  entity: "org",
                  field: "relationshipType",
                  op: "eq",
                  value: "vip",
                } satisfies PlaybookRecordConditionTrigger,
              },
              sectionMeta: null,
              validationErrors: [],
            },
          ],
          errors: [],
        });

        const index = await buildWorkspaceRecordConditionIndex("ws-1");

        expect(index.get("person.relationshipType") ?? []).toHaveLength(0);
        expect(index.get("org.relationshipType")).toHaveLength(1);
      });
    });

    describe("dispatchRecordConditionTrigger", () => {
      const write = {
        workspaceId: "ws-1",
        entity: "person" as const,
        field: "relationshipType",
        newValue: "client",
        entityId: "person-1",
        entityLabel: "Anna",
      };

      function setupConditionDispatch() {
        const playbook = makeConditionPlaybook("welcome-client", clientCondition);
        mockDiscoverV2Playbooks.mockReturnValue({
          sections: new Map(),
          allPlaybooks: [playbook],
          errors: [],
        });
        mockGetPlaybookBySlug.mockReturnValue(playbook);
        tableResults["profile_playbook_settings"] = { data: null, error: null };
        tableResults["play_runs"] = { data: null, error: null };
        return playbook;
      }

      it("executes matching playbooks when the condition holds", async () => {
        setupConditionDispatch();
        mockExecutePlaybookV2.mockResolvedValue({
          status: "paused",
          playbookSlug: "welcome-client",
          stepResults: [],
          pausedAt: { playRunId: "run-1" },
        });

        const results = await dispatchRecordConditionTrigger(write);

        expect(mockExecutePlaybookV2).toHaveBeenCalledTimes(1);
        expect(mockBuildContext).toHaveBeenCalledWith(
          "ws-1",
          "actor-user-1",
          expect.objectContaining({
            type: "signal",
            signalKey: "record_condition.person.relationshipType",
            entityId: "person-1",
            entitySurface: "person",
            entityLabel: "Anna",
          }),
          undefined,
          undefined,
          expect.any(String)
        );
        expect(results[0]).toEqual({
          success: true,
          playbookSlug: "welcome-client",
          playRunId: "run-1",
        });
      });

      it("does not fire when the value does not satisfy the condition", async () => {
        setupConditionDispatch();

        const results = await dispatchRecordConditionTrigger({
          ...write,
          newValue: "prospect",
        });

        expect(mockExecutePlaybookV2).not.toHaveBeenCalled();
        expect(results).toHaveLength(0);
      });

      it("matches writes spelled as dbColumn against registry-key triggers", async () => {
        setupConditionDispatch();
        mockExecutePlaybookV2.mockResolvedValue({
          status: "paused",
          playbookSlug: "welcome-client",
          stepResults: [],
          pausedAt: { playRunId: "run-1" },
        });

        const results = await dispatchRecordConditionTrigger({
          ...write,
          field: "relationship_type",
        });

        expect(mockExecutePlaybookV2).toHaveBeenCalledTimes(1);
        expect(results[0].playRunId).toBe("run-1");
      });

      it("ignores writes to fields with no indexed condition", async () => {
        setupConditionDispatch();

        const results = await dispatchRecordConditionTrigger({
          ...write,
          field: "timezone",
        });

        expect(mockExecutePlaybookV2).not.toHaveBeenCalled();
        expect(results).toHaveLength(0);
      });

      it("skips disabled playbooks", async () => {
        setupConditionDispatch();
        tableResults["profile_playbook_settings"] = {
          data: { enabled: false },
          error: null,
        };

        const results = await dispatchRecordConditionTrigger(write);

        expect(mockExecutePlaybookV2).not.toHaveBeenCalled();
        expect(results[0]).toEqual({
          success: false,
          playbookSlug: "welcome-client",
          skipped: "disabled",
        });
      });

      it("applies the 72h cooldown per playbook + entity + condition", async () => {
        setupConditionDispatch();
        tableResults["play_runs"] = { data: { id: "run-recent" }, error: null };

        const results = await dispatchRecordConditionTrigger(write);

        expect(mockExecutePlaybookV2).not.toHaveBeenCalled();
        expect(results[0]).toEqual({
          success: true,
          playbookSlug: "welcome-client",
          skipped: "cooldown",
        });
      });
    });
  });
});
