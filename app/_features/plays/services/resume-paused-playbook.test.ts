import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resumePausedPlaybook,
  type PlaybookApprovalContext,
  type ResumePausedPlaybookDeps,
} from "./resume-paused-playbook";

/**
 * The regression these guard against: this path used to mark the run `ran` and
 * write "Approved and executed" without ever calling the tool. Approving a
 * paused send reported success for an email that was never sent.
 */

const APPROVAL: PlaybookApprovalContext = {
  tool_slug: "GMAIL_SEND_EMAIL",
  args: { to: "client@example.com", subject: "Invoice" },
  step_index: 2,
};

interface Harness {
  deps: ResumePausedPlaybookDeps;
  executeTool: ReturnType<typeof vi.fn>;
  finalizeRun: ReturnType<typeof vi.fn>;
  recordActivity: ReturnType<typeof vi.fn>;
  meterExecution: ReturnType<typeof vi.fn>;
  claimRun: ReturnType<typeof vi.fn>;
}

function createHarness(overrides?: {
  approvalContext?: PlaybookApprovalContext | null;
  runMissing?: boolean;
  claimSucceeds?: boolean;
  executeRejects?: Error;
}): Harness {
  const executeTool = vi.fn(async () => {
    if (overrides?.executeRejects) throw overrides.executeRejects;
    return { id: "msg_1" };
  });
  const finalizeRun = vi.fn(async () => {});
  const recordActivity = vi.fn(async () => {});
  const meterExecution = vi.fn(async () => {});
  const claimRun = vi.fn(async () => overrides?.claimSucceeds ?? true);

  const deps: ResumePausedPlaybookDeps = {
    loadRun: vi.fn(async () =>
      overrides?.runMissing
        ? null
        : {
            id: "run_1",
            title: "Send invoice",
            approvalContext:
              overrides?.approvalContext === undefined
                ? APPROVAL
                : overrides.approvalContext,
          },
    ),
    claimRun,
    executeTool,
    finalizeRun,
    recordActivity,
    meterExecution,
    now: () => "2026-08-05T12:00:00.000Z",
  };

  return { deps, executeTool, finalizeRun, recordActivity, meterExecution, claimRun };
}

const INPUT = { playRunId: "run_1", workspaceId: "ws_1", userId: "user_1" };

describe("resumePausedPlaybook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actually executes the approved tool with its recorded args", async () => {
    const h = createHarness();

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: true });
    expect(h.executeTool).toHaveBeenCalledTimes(1);
    expect(h.executeTool).toHaveBeenCalledWith(
      "GMAIL_SEND_EMAIL",
      { to: "client@example.com", subject: "Invoice" },
      expect.objectContaining({ workspaceId: "ws_1", actorUserId: "user_1" }),
    );
  });

  // Consent is for the one call the gate asked about, not the whole playbook.
  it("consents to exactly the approved slug and nothing wider", async () => {
    const h = createHarness();

    await resumePausedPlaybook(INPUT, h.deps);

    const context = h.executeTool.mock.calls[0]?.[2] as {
      approvedActions: readonly string[];
    };
    expect(context.approvedActions).toEqual(["GMAIL_SEND_EMAIL"]);
  });

  it("marks the run ran only after the tool returns", async () => {
    const h = createHarness();
    const order: string[] = [];
    h.executeTool.mockImplementation(async () => {
      order.push("execute");
      return {};
    });
    h.finalizeRun.mockImplementation(async () => {
      order.push("finalize");
    });

    await resumePausedPlaybook(INPUT, h.deps);

    expect(order).toEqual(["execute", "finalize"]);
    expect(h.finalizeRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({ state: "ran", paused_for_approval: false }),
    );
  });

  // Billing correctness: the slug is what makes an external send billable.
  it("meters with the real slug so a resumed send is not billed as free", async () => {
    const h = createHarness();

    await resumePausedPlaybook(INPUT, h.deps);

    expect(h.meterExecution).toHaveBeenCalledWith("ws_1", "run_1", [
      "GMAIL_SEND_EMAIL",
    ]);
  });

  it("claims the run before executing, so a double approval cannot send twice", async () => {
    const h = createHarness();
    const order: string[] = [];
    h.claimRun.mockImplementation(async () => {
      order.push("claim");
      return true;
    });
    h.executeTool.mockImplementation(async () => {
      order.push("execute");
      return {};
    });

    await resumePausedPlaybook(INPUT, h.deps);

    expect(order).toEqual(["claim", "execute"]);
  });

  it("does not execute when the claim is lost to a concurrent approval", async () => {
    const h = createHarness({ claimSucceeds: false });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result.ok).toBe(false);
    expect(h.executeTool).not.toHaveBeenCalled();
    expect(h.meterExecution).not.toHaveBeenCalled();
  });
});

describe("resumePausedPlaybook failure handling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports failure instead of success when the tool throws", async () => {
    const h = createHarness({ executeRejects: new Error("Gmail rejected the send") });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: false, error: "Gmail rejected the send" });
  });

  it("marks the run failed rather than ran", async () => {
    const h = createHarness({ executeRejects: new Error("boom") });

    await resumePausedPlaybook(INPUT, h.deps);

    expect(h.finalizeRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({ state: "failed", last_error: "boom" }),
    );
  });

  // No external effect means no bill, matching the executor.
  it("does not bill a send that never landed", async () => {
    const h = createHarness({ executeRejects: new Error("boom") });

    await resumePausedPlaybook(INPUT, h.deps);

    expect(h.meterExecution).not.toHaveBeenCalled();
  });

  it("does not claim the activity feed says it executed", async () => {
    const h = createHarness({ executeRejects: new Error("boom") });

    await resumePausedPlaybook(INPUT, h.deps);

    const detail = h.recordActivity.mock.calls[0]?.[0]?.detail as string;
    expect(detail).toContain("failed");
    expect(detail).not.toContain("Approved and executed");
  });
});

describe("resumePausedPlaybook guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses a missing run without touching the connector", async () => {
    const h = createHarness({ runMissing: true });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: false, error: "Play run not found" });
    expect(h.claimRun).not.toHaveBeenCalled();
    expect(h.executeTool).not.toHaveBeenCalled();
  });

  it("refuses a run with no approval context", async () => {
    const h = createHarness({ approvalContext: null });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: false, error: "No approval context found" });
    expect(h.executeTool).not.toHaveBeenCalled();
  });
});
