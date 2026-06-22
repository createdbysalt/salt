import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallOptions } from "ai";
import { buildSystemPlayTools } from "./system-play-tools";

vi.mock("@/app/_lib/composio/execution-log", () => ({
  logToolExecution: vi.fn(async () => undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/_features/capture/services/system-plays/executor", () => ({
  executeSystemPlay: vi.fn(async () => ({
    success: true,
    entity_id: "person-1",
    entity_type: "person",
  })),
}));

vi.mock("@/app/_features/capture/services/system-plays/lookups", () => ({
  findPeople: vi.fn(async () => [{ id: "person-1", name: "Jane", email: null, relationship_type: null }]),
  findOrgs: vi.fn(async () => []),
}));

vi.mock("@/app/_features/plays/playbooks/profile/load-profile-playbook", () => ({
  loadPeopleProfilePlaybook: vi.fn(async () => ({
    systemRules: null,
    settings: null,
    blueprintVersion: 1,
  })),
}));

vi.mock("@/app/_features/plays/playbooks/profile/write-provenance", () => ({
  applyProfileFieldResults: vi.fn(async () => undefined),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  })),
}));

import { executeSystemPlay } from "@/app/_features/capture/services/system-plays/executor";
import { findPeople } from "@/app/_features/capture/services/system-plays/lookups";
import { logToolExecution } from "@/app/_lib/composio/execution-log";

const callOptions = { toolCallId: "call-1", messages: [] } as ToolCallOptions;

describe("buildSystemPlayTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers memory tools including lookups and mutators", () => {
    const tools = buildSystemPlayTools({
      workspaceId: "ws-1",
      userId: "user-1",
    });

    expect(tools.memory_find_people).toBeDefined();
    expect(tools.memory_create_person).toBeDefined();
    expect(tools.memory_archive_person?.needsApproval).toBe(true);
    expect(tools.memory_create_person?.needsApproval).toBeDefined();
  });

  it("runs lookup tools without executeSystemPlay", async () => {
    const tools = buildSystemPlayTools({ workspaceId: "ws-1", userId: "user-1" });
    const result = await tools.memory_find_people?.execute?.(
      { query: "Jane" },
      callOptions,
    );

    expect(findPeople).toHaveBeenCalledWith("ws-1", "Jane", 10);
    expect(result).toEqual([
      { id: "person-1", name: "Jane", email: null, relationship_type: null },
    ]);
    expect(executeSystemPlay).not.toHaveBeenCalled();
  });

  it("executes create person and logs audit", async () => {
    const tools = buildSystemPlayTools({ workspaceId: "ws-1", userId: "user-1" });
    await tools.memory_create_person?.execute?.(
      { email: "jane@acme.com" },
      callOptions,
    );

    expect(executeSystemPlay).toHaveBeenCalledWith(
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

  it("requests approval for risky person creation", async () => {
    const tools = buildSystemPlayTools({ workspaceId: "ws-1", userId: "user-1" });
    const needsApproval = tools.memory_create_person?.needsApproval;

    expect(typeof needsApproval).toBe("function");
    if (typeof needsApproval !== "function") {
      throw new Error("memory_create_person should use dynamic approval");
    }

    await expect(
      needsApproval({ input: { name: "Maya Chen" } }, callOptions),
    ).resolves.toBe(true);
  });
});
