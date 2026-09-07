import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getApprovedToolClassification,
  getWorkspaceConnectorPolicy,
  classificationStatusSingle,
} = vi.hoisted(() => ({
  getApprovedToolClassification: vi.fn(),
  getWorkspaceConnectorPolicy: vi.fn(),
  classificationStatusSingle: vi.fn(),
}));

vi.mock("@/app/_lib/composio/classification-store", () => ({
  getApprovedToolClassification,
}));

vi.mock("@/app/_features/connectors/queries", () => ({
  getWorkspaceConnectorPolicy,
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: classificationStatusSingle }),
      }),
    }),
  }),
}));

import { assertComposioToolAllowed } from "@/app/_lib/composio/tool-policy";
import { checkRunPreconditions } from "./check-run-preconditions";
import { MEMORY_NOTE_TOOL_SLUG } from "./write-memory-note";

const INPUT = { workspaceId: "ws-1", toolSlug: "GMAIL_SEND_EMAIL" };

function mockPolicy(policy: {
  risk: "read" | "mutating" | "destructive";
  requiresHumanConfirmation?: boolean;
}) {
  getApprovedToolClassification.mockResolvedValue({
    toolSlug: INPUT.toolSlug,
    ...policy,
  });
}

function mockConnectorPolicy(input: {
  trust?: "read_only" | "act_with_approval" | "trust";
  emailMode?: "draft" | "send";
}) {
  getWorkspaceConnectorPolicy.mockResolvedValue({
    trustByProvider: { gmail: input.trust ?? "act_with_approval" },
    emailModeByProvider: { gmail: input.emailMode ?? "send" },
  });
}

describe("checkRunPreconditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classificationStatusSingle.mockResolvedValue({ data: null, error: null });
  });

  it("memory-note sentinel: will_execute without touching the connector gate", async () => {
    const verdict = await checkRunPreconditions({
      workspaceId: "ws-1",
      toolSlug: MEMORY_NOTE_TOOL_SLUG,
      targetLabel: "Acme MSA 2026.pdf",
    });

    expect(verdict.kind).toBe("will_execute");
    expect(verdict.summary).toContain("Acme MSA 2026.pdf");
    expect(getApprovedToolClassification).not.toHaveBeenCalled();
  });

  it("approved send tool + send mode → will_execute via Gmail", async () => {
    mockPolicy({ risk: "mutating", requiresHumanConfirmation: true });
    mockConnectorPolicy({ trust: "act_with_approval", emailMode: "send" });

    const verdict = await checkRunPreconditions(INPUT);

    expect(verdict.kind).toBe("will_execute");
    expect(verdict.summary).toBe("Will send via Gmail");
    expect(verdict.effectiveToolSlug).toBe("GMAIL_SEND_EMAIL");
  });

  it("draft mode → will_draft with the draft tool as the effective slug", async () => {
    mockPolicy({ risk: "mutating", requiresHumanConfirmation: true });
    mockConnectorPolicy({ trust: "act_with_approval", emailMode: "draft" });

    const verdict = await checkRunPreconditions(INPUT);

    expect(verdict.kind).toBe("will_draft");
    expect(verdict.summary).toContain("draft mode");
    expect(verdict.effectiveToolSlug).toBe("GMAIL_CREATE_EMAIL_DRAFT");
    expect(verdict.fixHref).toBe("?settings=connectors");
  });

  it("read-only trust → blocked_trust with the Plays settings link", async () => {
    mockPolicy({ risk: "mutating" });
    mockConnectorPolicy({ trust: "read_only", emailMode: "send" });

    const verdict = await checkRunPreconditions(INPUT);

    expect(verdict.kind).toBe("blocked_trust");
    expect(verdict.summary).toContain("Read only");
    expect(verdict.fixHref).toBe("/settings/plays");
  });

  it("no approved classification + drift-disabled row → blocked_classification, re-review copy", async () => {
    getApprovedToolClassification.mockResolvedValue(null);
    classificationStatusSingle.mockResolvedValue({
      data: { status: "disabled" },
      error: null,
    });

    const verdict = await checkRunPreconditions(INPUT);

    expect(verdict.kind).toBe("blocked_classification");
    expect(verdict.summary).toBe("Pending security re-review");
    expect(verdict.detail).not.toContain("not approved");
  });

  it("no approved classification + no row → blocked_classification, unclassified copy", async () => {
    getApprovedToolClassification.mockResolvedValue(null);
    classificationStatusSingle.mockResolvedValue({ data: null, error: null });

    const verdict = await checkRunPreconditions(INPUT);

    expect(verdict.kind).toBe("blocked_classification");
    expect(verdict.summary).toContain("not yet classified");
  });

  it("destructive classification → blocked, never executable", async () => {
    mockPolicy({ risk: "destructive" });

    const verdict = await checkRunPreconditions(INPUT);

    expect(verdict.kind).toBe("blocked_classification");
    expect(verdict.summary).toBe("Never executable");
  });

  it("read tools skip the trust ladder entirely", async () => {
    getApprovedToolClassification.mockResolvedValue({
      toolSlug: "GMAIL_FETCH_EMAILS",
      risk: "read",
    });

    const verdict = await checkRunPreconditions({
      workspaceId: "ws-1",
      toolSlug: "GMAIL_FETCH_EMAILS",
    });

    expect(verdict.kind).toBe("will_execute");
    expect(getWorkspaceConnectorPolicy).not.toHaveBeenCalled();
  });

  // Conformance: the preview's classification verdict must agree with the
  // real gate — when the preview says blocked_classification, the gate
  // throws; when it says anything else, the gate allows.
  describe("conformance with assertComposioToolAllowed", () => {
    it("null policy: gate throws, preview blocks", async () => {
      getApprovedToolClassification.mockResolvedValue(null);

      const verdict = await checkRunPreconditions(INPUT);
      expect(verdict.kind).toBe("blocked_classification");
      expect(() =>
        assertComposioToolAllowed(INPUT.toolSlug, { policy: null })
      ).toThrow();
    });

    it("destructive policy: gate throws, preview blocks", async () => {
      const policy = {
        slug: INPUT.toolSlug,
        risk: "destructive" as const,
        requiresHumanConfirmation: true,
      };
      getApprovedToolClassification.mockResolvedValue(policy);

      const verdict = await checkRunPreconditions(INPUT);
      expect(verdict.kind).toBe("blocked_classification");
      expect(() =>
        assertComposioToolAllowed(INPUT.toolSlug, { policy })
      ).toThrow(/destructive/);
    });

    it("approved mutating policy: gate allows, preview does not block on classification", async () => {
      const policy = {
        slug: INPUT.toolSlug,
        risk: "mutating" as const,
        requiresHumanConfirmation: true,
      };
      getApprovedToolClassification.mockResolvedValue(policy);
      mockConnectorPolicy({ trust: "trust", emailMode: "send" });

      const verdict = await checkRunPreconditions(INPUT);
      expect(verdict.kind).toBe("will_execute");
      expect(() =>
        assertComposioToolAllowed(INPUT.toolSlug, { policy })
      ).not.toThrow();
    });
  });
});
