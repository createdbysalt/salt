/**
 * Tag-fit producer (registry-wiring Phase 4): assigns EXISTING workspace
 * tags when a deterministic fit rule clears the bar, then dispatches the
 * person_tag_fit_detected signal so the evidence chain records the fit.
 * Coining new tags stays gated — a fit against a tag the workspace does not
 * have is a no-op.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const memoryGetFactsMock = vi.fn(async (_input: unknown) => ({
  entityType: "person",
  entityId: "person-1",
  facts: {},
  signals: {},
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryGetFacts: (input: unknown) => memoryGetFactsMock(input),
}));

const runCareForSignalMock = vi.fn(async (_input: unknown) => []);
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (input: unknown) => runCareForSignalMock(input),
}));

const executeSystemPlayMock = vi.fn(
  async (_ws: string, _slug: string, _input: unknown) => ({ success: true }),
);
vi.mock("../system-plays/executor", () => ({
  executeSystemPlay: (...args: unknown[]) =>
    executeSystemPlayMock(...(args as [string, string, unknown])),
}));

interface AdminState {
  tags: Array<{ id: string; slug: string; label: string; scope: string }>;
  assignments: Array<{ tag_id: string }>;
}

function stubAdmin(state: AdminState) {
  createAdminClientMock.mockReturnValue({
    from: (table: string) => {
      const result =
        table === "workspace_tags"
          ? { data: state.tags, error: null }
          : { data: state.assignments, error: null };
      const chain: object = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "then") {
              return (resolve: (value: unknown) => unknown) =>
                Promise.resolve(result).then(resolve);
            }
            return () => chain;
          },
        },
      );
      return chain;
    },
  });
}

const createAdminClientMock = vi.fn();
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => createAdminClientMock(),
}));

import { producePersonTagFits } from "./person-tag-fit-producer";

const VIP_TAG = { id: "tag-1", slug: "vip", label: "VIP", scope: "all" };

describe("producePersonTagFits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns an existing tag when the fit rule clears", async () => {
    stubAdmin({ tags: [VIP_TAG], assignments: [] });
    memoryGetFactsMock.mockResolvedValue({
      entityType: "person",
      entityId: "person-1",
      facts: {},
      signals: { has_payment_received: true, has_calendar_meeting: true },
    });

    const result = await producePersonTagFits({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "stripe",
    });

    expect(result.assigned).toEqual(["VIP"]);
    expect(executeSystemPlayMock).toHaveBeenCalledWith(
      "ws-1",
      "system:assign-tag",
      expect.objectContaining({
        entity_type: "person",
        entity_id: "person-1",
        tag_label: "VIP",
      }),
    );
    expect(runCareForSignalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "person_tag_fit_detected",
        entityType: "person",
        entityId: "person-1",
        evidence: expect.objectContaining({
          signalValues: { person_tag_fit_detected: "VIP" },
        }),
      }),
    );
  });

  it("never coins a tag the workspace does not have", async () => {
    stubAdmin({ tags: [], assignments: [] });
    memoryGetFactsMock.mockResolvedValue({
      entityType: "person",
      entityId: "person-1",
      facts: {},
      signals: { has_payment_received: true, has_calendar_meeting: true },
    });

    const result = await producePersonTagFits({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "stripe",
    });

    expect(result.assigned).toEqual([]);
    expect(executeSystemPlayMock).not.toHaveBeenCalled();
  });

  it("skips tags already assigned to the person", async () => {
    stubAdmin({ tags: [VIP_TAG], assignments: [{ tag_id: "tag-1" }] });
    memoryGetFactsMock.mockResolvedValue({
      entityType: "person",
      entityId: "person-1",
      facts: {},
      signals: { has_payment_received: true, has_calendar_meeting: true },
    });

    const result = await producePersonTagFits({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "stripe",
    });

    expect(result.assigned).toEqual([]);
    expect(executeSystemPlayMock).not.toHaveBeenCalled();
  });

  it("does nothing when the fit rule does not clear", async () => {
    stubAdmin({ tags: [VIP_TAG], assignments: [] });
    memoryGetFactsMock.mockResolvedValue({
      entityType: "person",
      entityId: "person-1",
      facts: {},
      signals: { has_payment_received: false, has_calendar_meeting: true },
    });

    const result = await producePersonTagFits({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "stripe",
    });

    expect(result.assigned).toEqual([]);
    expect(executeSystemPlayMock).not.toHaveBeenCalled();
  });

  it("ignores tags scoped away from people", async () => {
    stubAdmin({
      tags: [{ ...VIP_TAG, scope: "billing" }],
      assignments: [],
    });
    memoryGetFactsMock.mockResolvedValue({
      entityType: "person",
      entityId: "person-1",
      facts: {},
      signals: { has_payment_received: true, has_calendar_meeting: true },
    });

    const result = await producePersonTagFits({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "stripe",
    });

    expect(result.assigned).toEqual([]);
  });
});
