import { beforeEach, describe, expect, it, vi } from "vitest";

const upserts: Array<{ row: Record<string, unknown>; onConflict?: string }> = [];
const updates: Array<Record<string, unknown>> = [];
let tableRows: Array<Record<string, unknown>> = [];

function fakeQuery() {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    },
    upsert: async (row: Record<string, unknown>, opts?: { onConflict?: string }) => {
      upserts.push({ row, onConflict: opts?.onConflict });
      return { error: null };
    },
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: () => ({ eq: async () => ({ error: null }) }) };
    },
    then: (
      resolve: (value: { data: Array<Record<string, unknown>>; error: unknown }) => void
    ) => {
      resolve({
        data: tableRows.filter(
          (r) =>
            r.workspace_id === filters.workspace_id && r.status === filters.status
        ),
        error: null,
      });
    },
  };
  return builder;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => fakeQuery() }),
}));

vi.mock("@/app/_lib/tenancy/context", () => ({
  getTenantContext: vi.fn(async () => ({
    context: {
      actorType: "workspaceMember",
      userId: "user-1",
      workspace: { id: "ws-1", role: "owner" },
      studio: null,
    },
  })),
}));

vi.mock("@/app/_lib/tenancy/guards", () => ({
  getWorkspaceMemberOrNull: vi.fn(
    (context: { workspace: { id: string } | null }) => context.workspace
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const repoDefinition = {
  name: "Invoice Reminder",
  slug: "invoice-reminder",
  version: "1.0.0",
  description: "Drafts payment reminders for overdue invoices",
  section: "billing",
  layer: "act",
  voice: "billing",
  trigger: { type: "signal", signal: "billing_due_date_passed" },
  settings: {
    grace_days: { type: "number", label: "Wait {value} days", default: 0 },
    tone: {
      type: "select",
      label: "Tone",
      default: "warm",
      options: ["warm", "neutral"],
    },
  },
  steps: [
    {
      step: "fetch",
      id: "overdue_invoices",
      from: "billing.read_invoices",
      where: { status: "overdue" },
    },
    {
      step: "branch",
      id: "per_invoice",
      steps: [
        {
          step: "draft",
          id: "reminder_email",
          prompt: "Draft a payment reminder.",
          max_tokens: 200,
        },
      ],
    },
    { step: "action", id: "send", tool: "GMAIL_CREATE_EMAIL_DRAFT" },
  ],
  tools: ["GMAIL_CREATE_EMAIL_DRAFT"],
  output: { type: "email_draft", approval: "ask" },
};

const mockGetPlaybookBySlug = vi.fn();
vi.mock("../playbooks/schema/v2/discovery", () => ({
  getPlaybookBySlug: (slug: string) => mockGetPlaybookBySlug(slug),
}));

import {
  resetPlaybookToDefaultAction,
  updatePlaybookDefinitionAction,
} from "./update-playbook-definition";

beforeEach(() => {
  upserts.length = 0;
  updates.length = 0;
  tableRows = [];
  mockGetPlaybookBySlug.mockReset();
  mockGetPlaybookBySlug.mockReturnValue({
    definition: structuredClone(repoDefinition),
    sectionMeta: null,
    validationErrors: [],
  });
});

describe("updatePlaybookDefinitionAction", () => {
  it("forks the repo definition into the DB on first edit", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      stepApprovals: { reminder_email: "ask" },
    });

    expect(result.success).toBe(true);
    expect(result.forked).toBe(true);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].onConflict).toBe("workspace_id,slug");
    expect(upserts[0].row).toMatchObject({
      workspace_id: "ws-1",
      slug: "invoice-reminder",
      source: "db",
      status: "active",
      created_by: "user-1",
    });

    const saved = upserts[0].row.definition as typeof repoDefinition;
    const branch = saved.steps[1] as (typeof repoDefinition.steps)[1];
    const draft = branch.steps?.[0] as { id: string; approval?: string };
    expect(draft.approval).toBe("ask");
  });

  it("edits the workspace copy in place once forked (shadowing)", async () => {
    tableRows = [
      {
        workspace_id: "ws-1",
        status: "active",
        slug: "invoice-reminder",
        definition: {
          ...structuredClone(repoDefinition),
          description: "Workspace-customized description",
        },
      },
    ];

    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      name: "My Invoice Reminder",
    });

    expect(result.success).toBe(true);
    expect(result.forked).toBe(false);
    const saved = upserts[0].row.definition as typeof repoDefinition;
    expect(saved.name).toBe("My Invoice Reminder");
    // Patch applied to the DB copy, not the repo default
    expect(saved.description).toBe("Workspace-customized description");
  });

  it("writes a multi-trigger list onto triggers and drops trigger", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      triggers: [
        { type: "signal", signal: "billing_due_date_passed" },
        { type: "schedule", cron: "0 9 * * 1" },
      ],
    });

    expect(result.success).toBe(true);
    const saved = upserts[0].row.definition as {
      trigger?: unknown;
      triggers?: Array<{ type: string }>;
    };
    expect(saved.trigger).toEqual({
      type: "signal",
      signal: "billing_due_date_passed",
    });
    expect(saved.triggers).toEqual([{ type: "schedule", cron: "0 9 * * 1" }]);
  });

  it("collapses a one-item triggers patch onto trigger", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      triggers: [{ type: "manual" }],
    });

    expect(result.success).toBe(true);
    const saved = upserts[0].row.definition as {
      trigger?: { type: string };
      triggers?: unknown[];
    };
    expect(saved.trigger).toEqual({ type: "manual" });
    expect(saved.triggers).toBeUndefined();
  });

  it("replaces the trigger and drops any triggers array", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      trigger: { type: "signal", signal: "billing_payment_matched" },
    });

    expect(result.success).toBe(true);
    const saved = upserts[0].row.definition as {
      trigger: { type: string; signal?: string };
      triggers?: unknown[];
    };
    expect(saved.trigger).toEqual({
      type: "signal",
      signal: "billing_payment_matched",
    });
    expect(saved.triggers).toBeUndefined();
  });

  it("rejects a patch that fails schema validation without writing", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      name: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(upserts).toHaveLength(0);
  });

  it("rejects a trigger with an unknown signal", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      trigger: { type: "signal", signal: "not_a_real_signal" },
    });

    expect(result.success).toBe(false);
    expect(upserts).toHaveLength(0);
  });

  it("writes a settings override to the field value, keeping the default", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      settings: { grace_days: 3, tone: "neutral" },
    });

    expect(result.success).toBe(true);
    const saved = upserts[0].row.definition as {
      settings: Record<string, { default: unknown; value?: unknown }>;
    };
    expect(saved.settings.grace_days).toMatchObject({ default: 0, value: 3 });
    expect(saved.settings.tone).toMatchObject({
      default: "warm",
      value: "neutral",
    });
  });

  it("rejects an unknown settings key without writing", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      settings: { bogus: 1 },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown setting "bogus"');
    expect(upserts).toHaveLength(0);
  });

  it("rejects a settings value of the wrong type", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      settings: { grace_days: "three" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("expects a number");
    expect(upserts).toHaveLength(0);
  });

  it("rejects a select value outside the declared options", async () => {
    const result = await updatePlaybookDefinitionAction("invoice-reminder", {
      settings: { tone: "aggressive" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("expects one of");
    expect(upserts).toHaveLength(0);
  });

  it("returns not-found for an unknown slug", async () => {
    mockGetPlaybookBySlug.mockReturnValue(null);

    const result = await updatePlaybookDefinitionAction("ghost", {
      name: "Ghost",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
    expect(upserts).toHaveLength(0);
  });
});

describe("resetPlaybookToDefaultAction", () => {
  it("archives the workspace copy so the repo default applies again", async () => {
    const result = await resetPlaybookToDefaultAction("invoice-reminder");

    expect(result).toEqual({ success: true });
    expect(updates[0].status).toBe("archived");
  });

  it("refuses to reset a playbook with no repo default", async () => {
    mockGetPlaybookBySlug.mockReturnValue(null);

    const result = await resetPlaybookToDefaultAction("workspace-only");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no Salt default");
    expect(updates).toHaveLength(0);
  });
});
