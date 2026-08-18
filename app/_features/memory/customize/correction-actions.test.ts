import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/app/_lib/composio/workspace-auth", () => ({
  requireAuthenticatedWorkspaceMember: vi.fn(async () => ({
    ok: true as const,
    workspaceId: "ws-1",
    userId: "user-1",
  })),
}));

const addRuleMock = vi.fn();
vi.mock("@/app/_features/capture/services/rules-manager", () => ({
  addRule: (...args: unknown[]) => addRuleMock(...args),
}));

const addCustomizeEntryMock = vi.fn();
vi.mock("./actions", () => ({
  addCustomizeEntry: (...args: unknown[]) => addCustomizeEntryMock(...args),
}));

import { rememberCorrection } from "./correction-actions";

beforeEach(() => {
  addRuleMock.mockReset();
  addCustomizeEntryMock.mockReset();
});

describe("rememberCorrection", () => {
  it("a hard exclusion lands in Sources as a workspace deny rule", async () => {
    addRuleMock.mockResolvedValue({ success: true, rule: { id: "rule-1" } });

    const result = await rememberCorrection({
      text: "never let in anything from @spammy-agency.com",
      source: "correction",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.landed).toBe("sources");
    expect(result.href).toBe("/sources?tab=customize&category=all");
    expect(addRuleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        provider: null,
        ruleType: "deny",
        entityType: "domain",
        entityKey: "spammy-agency.com",
        source: "correction",
        createdBy: "user-1",
      }),
    );
    expect(addCustomizeEntryMock).not.toHaveBeenCalled();
  });

  it("an already-known exclusion is reported honestly, not as an error", async () => {
    addRuleMock.mockResolvedValue({ success: false, error: "Rule already exists" });

    const result = await rememberCorrection({
      text: "never let in anything from @spammy-agency.com",
      source: "correction",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.landed).toBe("sources");
    expect(result.message).toContain("already");
  });

  it("a generalization lands in the right Memory doc as a correction entry", async () => {
    addCustomizeEntryMock.mockResolvedValue({
      success: true,
      data: { id: "entry-1" },
      enforcement: "advisory",
    });

    const result = await rememberCorrection({
      text: "never treat my accountant as a client",
      source: "correction",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.landed).toBe("memory");
    expect(result.href).toBe("/memory?tab=customize&type=person");
    expect(addCustomizeEntryMock).toHaveBeenCalledWith({
      entityType: "person",
      body: "never treat my accountant as a client",
      source: "correction",
    });
    expect(addRuleMock).not.toHaveBeenCalled();
  });

  it("a work generalization deep-links to the work doc", async () => {
    addCustomizeEntryMock.mockResolvedValue({
      success: true,
      data: { id: "entry-2" },
      enforcement: "advisory",
    });

    const result = await rememberCorrection({
      text: "every project needs a deadline before I start",
      source: "ask_salt",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.href).toBe("/memory?tab=customize&type=work");
  });

  it("propagates a Memory write failure", async () => {
    addCustomizeEntryMock.mockResolvedValue({
      success: false,
      error: "conflict",
    });

    const result = await rememberCorrection({
      text: "my accountant is not a client",
      source: "correction",
    });

    expect(result.success).toBe(false);
  });

  it("propagates a rule-write failure", async () => {
    addRuleMock.mockResolvedValue({ success: false, error: "db down" });

    const result = await rememberCorrection({
      text: "never let in anything from @spammy-agency.com",
      source: "correction",
    });

    expect(result.success).toBe(false);
  });
});
