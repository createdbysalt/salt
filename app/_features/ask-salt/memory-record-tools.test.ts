import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallOptions } from "ai";
import { buildMemoryRecordTools } from "./memory-record-tools";

const h = vi.hoisted(() => ({
  operatorIdentity: {
    emails: new Set<string>(),
    names: new Set<string>(),
    domains: new Set<string>(),
  },
}));

vi.mock("@/app/_lib/identity/operator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/_lib/identity/operator")>();
  return {
    ...actual,
    getOperatorIdentity: vi.fn(async () => h.operatorIdentity),
  };
});

vi.mock("@/app/_lib/composio/execution-log", () => ({
  logToolExecution: vi.fn(async () => undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/_features/memory/records/executor", () => ({
  executeRecordAction: vi.fn(async () => ({
    success: true,
    entity_id: "person-1",
    entity_type: "person",
  })),
}));

vi.mock("@/app/_features/memory/records/lookups", () => ({
  findPeople: vi.fn(async () => [{ id: "person-1", name: "Jane", email: null, relationship_type: null }]),
  findOrgs: vi.fn(async () => []),
}));

vi.mock("@/app/_features/plays/playbooks/records-engine/load-profile-playbook", () => ({
  loadPeopleProfilePlaybook: vi.fn(async () => ({
    systemRules: null,
    settings: null,
    blueprintVersion: 1,
  })),
}));

vi.mock("@/app/_features/plays/playbooks/records-engine/write-provenance", () => ({
  applyProfileFieldResults: vi.fn(async () => undefined),
}));

vi.mock("@/app/_features/plays/playbooks/records-engine/apply-connection-links", () => ({
  applyConnectionLinks: vi.fn(async () => undefined),
  buildPersonLinkSignals: vi.fn(() => ({
    user_specified_org: false,
    user_specified_work: false,
    org_domain: null,
    email_domain_is_personal: false,
  })),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
      upsert: vi.fn(async () => ({ error: null })),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { id: "person-1" }, error: null })),
    })),
  })),
}));

import { executeRecordAction } from "@/app/_features/memory/records/executor";
import { findPeople } from "@/app/_features/memory/records/lookups";
import { logToolExecution } from "@/app/_lib/composio/execution-log";

const callOptions = { toolCallId: "call-1", messages: [] } as ToolCallOptions;

describe("buildMemoryRecordTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.operatorIdentity.emails.clear();
    h.operatorIdentity.names.clear();
    h.operatorIdentity.domains.clear();
  });

  it("registers memory tools including lookups and mutators", () => {
    const tools = buildMemoryRecordTools({
      workspaceId: "ws-1",
      userId: "user-1",
    });

    expect(tools.memory_find_people).toBeDefined();
    expect(tools.memory_create_person).toBeDefined();
    // Memory full autonomy: no in-chat approval gates, including archive
    // (soft delete, restorable). Correction replaces approval.
    expect(tools.memory_archive_person?.needsApproval).toBeUndefined();
    expect(tools.memory_create_person?.needsApproval).toBeUndefined();
  });

  it("runs lookup tools without executeRecordAction", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    const result = await tools.memory_find_people?.execute?.(
      { query: "Jane" },
      callOptions,
    );

    expect(findPeople).toHaveBeenCalledWith("ws-1", "Jane", 10);
    expect(result).toEqual([
      { id: "person-1", name: "Jane", email: null, relationship_type: null },
    ]);
    expect(executeRecordAction).not.toHaveBeenCalled();
  });

  it("executes create person and logs audit", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    await tools.memory_create_person?.execute?.(
      { email: "jane@acme.com" },
      callOptions,
    );

    expect(executeRecordAction).toHaveBeenCalledWith(
      "ws-1",
      "system:create-person",
      expect.objectContaining({ name: "Jane", email: "jane@acme.com" }),
      "user-1",
    );
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        toolSlug: "memory_create_person",
        source: "ask_salt",
        status: "success",
      }),
    );
  });

  it("returns suggest_merge without creating when duplicates conflict", async () => {
    vi.mocked(findPeople).mockResolvedValueOnce([
      {
        id: "person-2",
        name: "Maya Chen",
        email: "maya@other.com",
        relationship_type: null,
      },
    ]);

    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    const result = await tools.memory_create_person?.execute?.(
      {
        name: "Maya Chen",
        email: "maya@acme.com",
        organization_name: "Acme",
      },
      callOptions,
    );

    expect(result).toMatchObject({ action: "suggest_merge", success: true });
    expect(executeRecordAction).not.toHaveBeenCalled();
  });

  it("creates a person with name only (no email)", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    await tools.memory_create_person?.execute?.(
      { name: "Liam Gillies", organization_name: "Acme Studio" },
      callOptions,
    );

    expect(executeRecordAction).toHaveBeenCalledWith(
      "ws-1",
      "system:create-person",
      expect.objectContaining({ name: "Liam Gillies" }),
      "user-1",
    );
  });

  it("returns a clear error for empty create-person input", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });

    const result = (await tools.memory_create_person?.execute?.({}, callOptions)) as {
      success: boolean;
      error: string;
      errorId: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Something went wrong while running that Salt action/i);
    expect(result.error).not.toMatch(/Provide name or email/i);
    expect(result.errorId).toMatch(/^SALT-[A-F0-9]{8}$/);
  });
});

describe("buildMemoryRecordTools — operator self-exclusion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.operatorIdentity.emails.clear();
    h.operatorIdentity.names.clear();
    h.operatorIdentity.domains.clear();
    h.operatorIdentity.emails.add("hello@createdbysalt.com");
    h.operatorIdentity.names.add("gabriella martins");
    h.operatorIdentity.names.add("salt studio");
    h.operatorIdentity.domains.add("createdbysalt.com");
  });

  it("refuses to create a person holding the operator's own email and redirects to Me", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    const result = (await tools.memory_create_person?.execute?.(
      { name: "Gabriella Martins", email: "hello@createdbysalt.com" },
      callOptions,
    )) as { success: boolean; action?: string; message?: string };

    expect(result.action).toBe("operator_self");
    expect(result.message).toMatch(/you|operator|Me/i);
    expect(executeRecordAction).not.toHaveBeenCalled();
  });

  it("refuses to create a person whose name matches the operator's profile name", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    const result = (await tools.memory_create_person?.execute?.(
      { name: "Gabriella  Martins" },
      callOptions,
    )) as { success: boolean; action?: string };

    expect(result.action).toBe("operator_self");
    expect(executeRecordAction).not.toHaveBeenCalled();
  });

  it("still creates a genuinely different person (control)", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    await tools.memory_create_person?.execute?.(
      { name: "Liam Gillies", email: "liam@photon.studio" },
      callOptions,
    );

    expect(executeRecordAction).toHaveBeenCalledWith(
      "ws-1",
      "system:create-person",
      expect.objectContaining({ name: "Liam Gillies" }),
      "user-1",
    );
  });

  it("refuses to create an org on the operator's own domain", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    const result = (await tools.memory_create_org?.execute?.(
      { name: "Createdbysalt", domain: "createdbysalt.com" },
      callOptions,
    )) as { success: boolean; action?: string; message?: string };

    expect(result.action).toBe("operator_self");
    expect(result.message).toMatch(/you|operator|Me/i);
    expect(executeRecordAction).not.toHaveBeenCalled();
  });

  it("refuses to create an org named after the workspace", async () => {
    const tools = buildMemoryRecordTools({ workspaceId: "ws-1", userId: "user-1" });
    const result = (await tools.memory_create_org?.execute?.(
      { name: "SALT STUDIO" },
      callOptions,
    )) as { success: boolean; action?: string };

    expect(result.action).toBe("operator_self");
    expect(executeRecordAction).not.toHaveBeenCalled();
  });
});
