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
  writeMemoryNote: ReturnType<typeof vi.fn>;
  loadEmailMode: ReturnType<typeof vi.fn>;
}

function createHarness(overrides?: {
  approvalContext?: PlaybookApprovalContext | null;
  runMissing?: boolean;
  claimSucceeds?: boolean;
  executeRejects?: Error;
  noteRejects?: Error;
  emailMode?: "draft" | "send";
}): Harness {
  const executeTool = vi.fn(async () => {
    if (overrides?.executeRejects) throw overrides.executeRejects;
    return { id: "msg_1" };
  });
  const finalizeRun = vi.fn(async () => {});
  const recordActivity = vi.fn(async () => {});
  const meterExecution = vi.fn(async () => {});
  const claimRun = vi.fn(async () => overrides?.claimSucceeds ?? true);
  const writeMemoryNote = vi.fn(async () => {
    if (overrides?.noteRejects) throw overrides.noteRejects;
  });
  const loadEmailMode = vi.fn(async () => overrides?.emailMode ?? "send");

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
    writeMemoryNote,
    loadEmailMode,
    now: () => "2026-08-05T12:00:00.000Z",
  };

  return { deps, executeTool, finalizeRun, recordActivity, meterExecution, claimRun, writeMemoryNote, loadEmailMode };
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

  it("includes a found pay button in the sent HTML", async () => {
    const pay = "https://invoice.stripe.com/i/acct_test/in_frank";
    const h = createHarness({
      approvalContext: {
        tool_slug: "GMAIL_SEND_EMAIL",
        args: {
          recipient_email: "frank@example.com",
          subject: "Payment reminder",
          body: "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella",
        },
        step_index: 4,
      },
    });
    h.deps.loadRun = vi.fn(async () => ({
      id: "run_1",
      title: "Send invoice",
      draftBody: "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella",
      approvalContext: {
        tool_slug: "GMAIL_SEND_EMAIL",
        args: {
          recipient_email: "frank@example.com",
          subject: "Payment reminder",
          body: "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella",
        },
        step_index: 4,
      },
      contextInputs: {
        invoice_context: { invoice: { pay_url: pay } },
      },
    }));

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: true });
    expect(h.executeTool).toHaveBeenCalledWith(
      "GMAIL_SEND_EMAIL",
      expect.objectContaining({
        is_html: true,
        body: expect.stringContaining(`href="${pay}"`),
      }),
      expect.anything()
    );
  });

  it("sends even if Open already wrote a review draft", async () => {
    const h = createHarness({
      approvalContext: {
        tool_slug: "GMAIL_CREATE_EMAIL_DRAFT",
        args: {
          recipient_email: "frank@example.com",
          subject: "Payment reminder",
          body: "Hi Frank,\n\nPlease pay.",
        },
        step_index: 4,
        inbox_draft_written: true,
      },
    });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: true });
    expect(h.executeTool).toHaveBeenCalledWith(
      "GMAIL_SEND_EMAIL",
      expect.objectContaining({
        recipient_email: "frank@example.com",
        is_html: true,
      }),
      expect.objectContaining({ approvedActions: ["GMAIL_SEND_EMAIL"] })
    );
    expect(h.meterExecution).toHaveBeenCalledWith("ws_1", "run_1", [
      "GMAIL_SEND_EMAIL",
    ]);
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

  describe("draft-mode fallback", () => {
    it("creates a draft instead of throwing when the provider is in draft mode", async () => {
      const h = createHarness({ emailMode: "draft" });

      const result = await resumePausedPlaybook(INPUT, h.deps);

      expect(result).toEqual({ ok: true });
      expect(h.loadEmailMode).toHaveBeenCalledWith("ws_1", "gmail");
      expect(h.executeTool).toHaveBeenCalledTimes(1);
      expect(h.executeTool).toHaveBeenCalledWith(
        "GMAIL_CREATE_EMAIL_DRAFT",
        // Gmail drafts take `recipient_email` — the send→draft remap renames.
        expect.objectContaining({ recipient_email: "client@example.com" }),
        expect.objectContaining({
          workspaceId: "ws_1",
          approvedActions: ["GMAIL_CREATE_EMAIL_DRAFT"],
        }),
      );
      expect(h.finalizeRun).toHaveBeenCalledWith(
        "run_1",
        "ws_1",
        expect.objectContaining({ state: "ran" }),
      );
    });

    it("activity entry says the draft was created because of draft mode", async () => {
      const h = createHarness({ emailMode: "draft" });

      await resumePausedPlaybook(INPUT, h.deps);

      expect(h.recordActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "resumed",
          detail: expect.stringContaining(
            "Draft created (Gmail is in draft mode)",
          ),
        }),
      );
    });

    it("meters the draft call — a fallback draft is still vendor spend", async () => {
      const h = createHarness({ emailMode: "draft" });

      await resumePausedPlaybook(INPUT, h.deps);

      expect(h.meterExecution).toHaveBeenCalledWith("ws_1", "run_1", [
        "GMAIL_CREATE_EMAIL_DRAFT",
      ]);
    });

    it("send mode executes the send slug unchanged", async () => {
      const h = createHarness({ emailMode: "send" });

      await resumePausedPlaybook(INPUT, h.deps);

      expect(h.executeTool).toHaveBeenCalledWith(
        "GMAIL_SEND_EMAIL",
        expect.anything(),
        expect.anything(),
      );
    });

    it("non-email tools never consult email mode", async () => {
      const h = createHarness({
        approvalContext: {
          tool_slug: "STRIPE_CREATE_INVOICE",
          args: { customer: "cus_1" },
          step_index: 1,
        },
        emailMode: "draft",
      });

      await resumePausedPlaybook(INPUT, h.deps);

      expect(h.loadEmailMode).not.toHaveBeenCalled();
      expect(h.executeTool).toHaveBeenCalledWith(
        "STRIPE_CREATE_INVOICE",
        expect.anything(),
        expect.anything(),
      );
    });
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

describe("resumePausedPlaybook memory_update outputs", () => {
  beforeEach(() => vi.clearAllMocks());

  const NOTE_ARGS = {
    entityType: "resource",
    entityId: "f-1",
    entityLabel: "Acme MSA 2026.pdf",
    title: "Contract Review — Acme MSA 2026.pdf",
    content: "Reviewed 2026-09-06 — 2 flags. Salt isn't a lawyer…",
  } as const;

  it("files the note for a run parked on the memory-note sentinel — no connector call, no bill", async () => {
    const h = createHarness({
      approvalContext: {
        tool_slug: "SALT_WRITE_MEMORY_NOTE",
        args: NOTE_ARGS,
        step_index: 4,
      },
    });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: true });
    expect(h.executeTool).not.toHaveBeenCalled();
    expect(h.writeMemoryNote).toHaveBeenCalledWith(
      "ws_1",
      expect.objectContaining({
        entityType: "resource",
        entityId: "f-1",
        content: NOTE_ARGS.content,
        sourceRef: "play_run:run_1",
      }),
    );
    // No external effect means no bill, matching the executor.
    expect(h.meterExecution).not.toHaveBeenCalled();
    expect(h.finalizeRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({ state: "ran", paused_for_approval: false }),
    );
    const detail = h.recordActivity.mock.calls[0]?.[0]?.detail as string;
    expect(detail).toContain("filed note");
  });

  it("files the riding-along note after an approved action executes", async () => {
    const h = createHarness({
      approvalContext: {
        tool_slug: "GMAIL_SEND_EMAIL",
        args: { to: "dana@acme.com", subject: "MSA changes" },
        step_index: 6,
        memory_update: NOTE_ARGS,
      },
    });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: true });
    expect(h.executeTool).toHaveBeenCalledTimes(1);
    expect(h.writeMemoryNote).toHaveBeenCalledWith(
      "ws_1",
      expect.objectContaining({ entityId: "f-1", sourceRef: "play_run:run_1" }),
    );
    expect(h.meterExecution).toHaveBeenCalledWith("ws_1", "run_1", ["GMAIL_SEND_EMAIL"]);
    const detail = h.recordActivity.mock.calls[0]?.[0]?.detail as string;
    expect(detail).toContain("Approved and executed: GMAIL_SEND_EMAIL");
    expect(detail).toContain("note filed");
  });

  it("a note failure after the send does not fail the run — the send already landed", async () => {
    const h = createHarness({
      noteRejects: new Error("notes table unavailable"),
      approvalContext: {
        tool_slug: "GMAIL_SEND_EMAIL",
        args: { to: "dana@acme.com", subject: "MSA changes" },
        step_index: 6,
        memory_update: NOTE_ARGS,
      },
    });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: true });
    expect(h.finalizeRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({ state: "ran" }),
    );
  });

  it("a failed sentinel note write marks the run failed, not ran", async () => {
    const h = createHarness({
      noteRejects: new Error("notes table unavailable"),
      approvalContext: {
        tool_slug: "SALT_WRITE_MEMORY_NOTE",
        args: NOTE_ARGS,
        step_index: 4,
      },
    });

    const result = await resumePausedPlaybook(INPUT, h.deps);

    expect(result).toEqual({ ok: false, error: "notes table unavailable" });
    expect(h.finalizeRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({ state: "failed" }),
    );
  });
});
