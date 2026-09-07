import { describe, expect, it, vi } from "vitest";
import {
  INBOX_DRAFT_PREP_VERSION,
  materializeInboxDraft,
  syncPreparedDraftBody,
  type MaterializeInboxDraftDeps,
  type MaterializeInboxDraftRun,
} from "./materialize-inbox-draft";

function run(overrides: Partial<MaterializeInboxDraftRun> = {}): MaterializeInboxDraftRun {
  return {
    id: "run_1",
    title: "Invoice Reminder",
    draftBody: "Hi Frank,\n\nJust a reminder.",
    approvalContext: {
      tool_slug: "GMAIL_CREATE_EMAIL_DRAFT",
      args: {
        recipient_email: "frank@example.com",
        subject: "Payment reminder",
        body: "Old body",
      },
      step_index: 4,
    },
    metadata: {},
    ...overrides,
  };
}

function createDeps(
  loaded: MaterializeInboxDraftRun | null,
  executeResult: unknown = { data: { id: "r-1", message: { id: "msg-99" } } }
) {
  const executeTool = vi.fn<MaterializeInboxDraftDeps["executeTool"]>(
    async () => executeResult
  );
  const saveRun = vi.fn<MaterializeInboxDraftDeps["saveRun"]>(async () => {});
  const meterExecution = vi.fn<MaterializeInboxDraftDeps["meterExecution"]>(
    async () => {}
  );
  const deps: MaterializeInboxDraftDeps = {
    loadRun: vi.fn(async () => loaded),
    executeTool,
    saveRun,
    meterExecution,
  };
  return { deps, executeTool, saveRun, meterExecution };
}

const INPUT = { playRunId: "run_1", workspaceId: "ws_1", userId: "user_1" };

describe("materializeInboxDraft", () => {
  it("returns a stored inbox draft URL without writing again", async () => {
    const { deps, executeTool } = createDeps(
      run({
        metadata: {
          inbox_draft_url: "https://mail.google.com/mail/#inbox?compose=msg-1",
          inbox_draft_prepared: true,
          inbox_draft_prep_version: INBOX_DRAFT_PREP_VERSION,
        },
      })
    );

    const result = await materializeInboxDraft(INPUT, deps);

    expect(result).toEqual({
      ok: true,
      url: "https://mail.google.com/mail/#inbox?compose=msg-1",
      label: "Gmail",
      draftBody: "Hi Frank,\n\nJust a reminder.",
    });
    expect(executeTool).not.toHaveBeenCalled();
  });

  it("rewrites Gmail when the Salt letter was edited after the last write", async () => {
    const { deps, executeTool } = createDeps(
      run({
        draftBody: "Hi Frank,\n\nPlease pay this week instead.",
        metadata: {
          inbox_draft_url: "https://mail.google.com/mail/#inbox?compose=old",
          inbox_draft_prepared: true,
          inbox_draft_prep_version: INBOX_DRAFT_PREP_VERSION,
          inbox_draft_letter: "Hi Frank,\n\nJust a reminder.",
        },
      })
    );

    await materializeInboxDraft(INPUT, deps);

    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it("repins a stored /mail/u/0/ URL to the connected inbox without rewriting Gmail", async () => {
    const { deps, executeTool } = createDeps(
      run({
        metadata: {
          inbox_draft_url: "https://mail.google.com/mail/u/0/#inbox?compose=msg-1",
          inbox_draft_prepared: true,
          inbox_draft_prep_version: INBOX_DRAFT_PREP_VERSION,
        },
      })
    );
    deps.loadInboxEmail = vi.fn(async () => "gabriella@studio.com");

    const result = await materializeInboxDraft(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe(
        "https://mail.google.com/mail/?authuser=gabriella%40studio.com#inbox?compose=msg-1"
      );
    }
    expect(executeTool).not.toHaveBeenCalled();
  });

  it("rewrites a stored Gmail draft that was created before the sign-off name", async () => {
    const { deps, executeTool } = createDeps(
      run({
        metadata: {
          inbox_draft_url: "https://mail.google.com/mail/u/0/#inbox?compose=old",
          inbox_draft_prepared: true,
        },
      })
    );

    await materializeInboxDraft(INPUT, deps);

    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it("signs the Gmail letter with the operator name", async () => {
    const { deps, executeTool } = createDeps(
      run({
        draftBody: "Hi Frank,\n\nPlease send payment.\n\nBest regards,",
      })
    );
    deps.loadSender = vi.fn(async () => ({ senderName: "Gabriella Martins" }));

    await materializeInboxDraft(INPUT, deps);

    expect(executeTool).toHaveBeenCalledWith(
      "GMAIL_CREATE_EMAIL_DRAFT",
      expect.objectContaining({
        body: expect.stringContaining("Gabriella Martins"),
      }),
      expect.anything()
    );
  });

  it("writes the cleaned letter back onto the Salt play", async () => {
    const { deps, saveRun } = createDeps(
      run({
        draftBody: [
          "**Subject:** Payment Reminder - Invoice INV-2026-1589 ($50.00)",
          "",
          "Hi Frank,",
          "",
          "Please send payment.",
          "",
          "Best regards,",
        ].join("\n"),
        approvalContext: {
          tool_slug: "GMAIL_CREATE_EMAIL_DRAFT",
          args: {
            recipient_email: "frank@example.com",
            subject: "Payment reminder — invoice INV-2026-1589",
            body: "Old body",
          },
          step_index: 4,
        },
      })
    );
    deps.loadSender = vi.fn(async () => ({ senderName: "Gabriella Martins" }));

    const result = await materializeInboxDraft(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draftBody).toBe(
        "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins"
      );
    }
    expect(saveRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({
        draft_body:
          "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins",
        approval_context: expect.objectContaining({
          args: expect.objectContaining({
            subject: "Payment Reminder - Invoice INV-2026-1589 ($50.00)",
          }),
        }),
      })
    );
  });

  it("rewrites a stored Gmail draft that was created before subject/HTML prep", async () => {
    const { deps, executeTool } = createDeps(
      run({
        metadata: {
          inbox_draft_url: "https://mail.google.com/mail/u/0/#inbox?compose=old",
        },
      })
    );

    await materializeInboxDraft(INPUT, deps);

    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it("writes the current Salt letter into Gmail and returns the draft link", async () => {
    const { deps, executeTool, saveRun, meterExecution } = createDeps(run());

    const result = await materializeInboxDraft(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe(
        "https://mail.google.com/mail/#inbox?compose=msg-99"
      );
    }
    expect(executeTool).toHaveBeenCalledWith(
      "GMAIL_CREATE_EMAIL_DRAFT",
      expect.objectContaining({
        recipient_email: "frank@example.com",
        subject: "Payment reminder",
        is_html: true,
        body: expect.stringContaining("Hi Frank,"),
      }),
      expect.objectContaining({ approvedActions: ["GMAIL_CREATE_EMAIL_DRAFT"] })
    );
    const writtenBody = (executeTool.mock.calls[0]?.[1] as { body: string }).body;
    expect(writtenBody).toContain("font-family:Arial");
    expect(writtenBody).not.toContain("<p>");
    expect(saveRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({
        draft_body: "Hi Frank,\n\nJust a reminder.",
        approval_context: expect.objectContaining({ inbox_draft_written: true }),
      })
    );
    expect(meterExecution).toHaveBeenCalledTimes(1);
    const saved = saveRun.mock.calls[0]?.[2];
    const artifacts = (
      saved?.metadata as { artifacts: Array<{ appId: string; url: string }> }
    ).artifacts;
    expect(artifacts.filter((a) => a.appId === "google")).toHaveLength(1);
  });

  it("replaces an existing Gmail artifact instead of adding a second Open in Gmail", async () => {
    const { deps, saveRun } = createDeps(
      run({
        metadata: {
          artifacts: [
            {
              appId: "google",
              label: "Draft in Gmail",
              url: "https://mail.google.com/mail/#inbox?compose=old",
            },
          ],
        },
      })
    );

    await materializeInboxDraft(INPUT, deps);

    const saved = saveRun.mock.calls[0]?.[2];
    const artifacts = (
      saved?.metadata as { artifacts: Array<{ appId: string; url: string }> }
    ).artifacts;
    expect(artifacts.filter((a) => a.appId === "google")).toHaveLength(1);
    expect(artifacts[0]?.url).toContain("compose=msg-99");
  });

  it("opens Gmail as the connected inbox, not account /u/0/", async () => {
    const { deps } = createDeps(run());
    deps.loadInboxEmail = vi.fn(async () => "gabriella@studio.com");

    const result = await materializeInboxDraft(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toContain("authuser=gabriella%40studio.com");
      expect(result.url).not.toContain("/mail/u/0");
    }
  });

  it("updates the stored Salt letter without writing Gmail", async () => {
    const { deps, executeTool, saveRun } = createDeps(
      run({
        draftBody: "**Subject:** Payment Reminder\n\nHi Frank,\n\nPlease pay.\n\nBest regards,",
      })
    );
    deps.loadSender = vi.fn(async () => ({ senderName: "Gabriella Martins" }));

    const result = await syncPreparedDraftBody(INPUT, deps);

    expect(result).toEqual({
      ok: true,
      subject: "Payment Reminder",
      draftBody: "Hi Frank,\n\nPlease pay.\n\nBest regards,\nGabriella Martins",
    });
    expect(executeTool).not.toHaveBeenCalled();
    expect(saveRun).toHaveBeenCalledWith(
      "run_1",
      "ws_1",
      expect.objectContaining({
        draft_body: "Hi Frank,\n\nPlease pay.\n\nBest regards,\nGabriella Martins",
      })
    );
  });

  it("writes a found hosted pay URL into the Gmail letter", async () => {
    const pay = "https://invoice.stripe.com/i/acct_test/in_frank";
    const { deps, executeTool } = createDeps(
      run({
        draftBody: "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella",
        contextInputs: {
          invoice_context: {
            invoice: { number: "INV-2026-1589", pay_url: pay },
          },
        },
      })
    );

    const result = await materializeInboxDraft(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draftBody).toContain(`Pay invoice: ${pay}`);
    }
    expect(executeTool).toHaveBeenCalledWith(
      "GMAIL_CREATE_EMAIL_DRAFT",
      expect.objectContaining({
        is_html: true,
        body: expect.stringContaining('href="https://invoice.stripe.com/i/acct_test/in_frank"'),
      }),
      expect.anything()
    );
    expect(executeTool.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: expect.stringContaining("Pay invoice"),
      })
    );
  });

  it("refuses to write when the pause is not an inbox draft", async () => {
    const { deps, executeTool } = createDeps(
      run({
        approvalContext: {
          tool_slug: "STRIPE_CREATE_INVOICE",
          args: {},
          step_index: 1,
        },
      })
    );

    const result = await materializeInboxDraft(INPUT, deps);

    expect(result).toEqual({
      ok: false,
      error: "This play has no inbox draft to open",
    });
    expect(executeTool).not.toHaveBeenCalled();
  });
});
