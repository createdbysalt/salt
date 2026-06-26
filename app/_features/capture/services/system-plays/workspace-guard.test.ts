import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertEntityInWorkspace,
  EntityNotInWorkspaceError,
} from "./workspace-guard";

const mockMaybeSingle = vi.fn();
const mockNeq = vi.fn();
const mockIs = vi.fn();
const mockEqSecond = vi.fn();
const mockEqFirst = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

describe("assertEntityInWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEqFirst });
    mockEqFirst.mockReturnValue({ eq: mockEqSecond });
    mockEqSecond.mockReturnValue({ is: mockIs, neq: mockNeq });
    mockIs.mockImplementation(() => ({
      is: mockIs,
      maybeSingle: mockMaybeSingle,
      neq: mockNeq,
    }));
    mockNeq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  });

  it("passes when entity exists in workspace", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "person-1" }, error: null });

    const admin = (await import("@/app/_lib/supabase/admin")).createAdminClient();
    await expect(
      assertEntityInWorkspace(admin, "ws-1", "person", "person-1"),
    ).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith("people");
    expect(mockEqSecond).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(mockIs).toHaveBeenCalledWith("deleted_at", null);
    expect(mockIs).toHaveBeenCalledWith("archived_at", null);
  });

  it("throws EntityNotInWorkspaceError when entity missing", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const admin = (await import("@/app/_lib/supabase/admin")).createAdminClient();
    await expect(
      assertEntityInWorkspace(admin, "ws-1", "person", "foreign-id"),
    ).rejects.toBeInstanceOf(EntityNotInWorkspaceError);
  });

  it("applies archived exclusion for spaces", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "space-1" }, error: null });

    const admin = (await import("@/app/_lib/supabase/admin")).createAdminClient();
    await assertEntityInWorkspace(admin, "ws-1", "space", "space-1");

    expect(mockFrom).toHaveBeenCalledWith("spaces");
    expect(mockNeq).toHaveBeenCalledWith("status", "archived");
    expect(mockIs).not.toHaveBeenCalled();
  });
});
