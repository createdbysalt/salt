import { beforeEach, describe, expect, it, vi } from "vitest";
import { restoreFromArchive, trashItem } from "./trash";

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEqThird = vi.fn();
const mockEqSecond = vi.fn();
const mockEqFirst = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/app/_lib/tenancy", () => ({
  getTenantContext: vi.fn(async () => ({
    context: { userId: "user-1", workspaceId: "ws-1" },
  })),
}));

vi.mock("@/app/_lib/tenancy/guards", () => ({
  requireWorkspaceMember: vi.fn((context: { workspaceId: string }) => ({
    id: context.workspaceId,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function setupFromChain() {
  mockFrom.mockReturnValue({ select: vi.fn(() => ({ eq: mockEqFirst })) });
  mockEqFirst.mockReturnValue({ eq: mockEqSecond });
  mockEqSecond.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockUpdate.mockReturnValue({ eq: mockEqFirst });
}

describe("memory trash actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFromChain();
    mockMaybeSingle.mockResolvedValue({ data: { id: "person-1" }, error: null });
  });

  it("restoreFromArchive clears archived_at for people", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
            })),
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            expect(payload.archived_at).toBeNull();
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  not: vi.fn(() => ({
                    is: vi.fn(async () => ({ error: null })),
                  })),
                })),
              })),
            };
          }),
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    const result = await restoreFromArchive("person", "person-1");
    expect(result).toEqual({ success: true });
  });

  it("trashItem sets deleted_at and deleted_by", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
            })),
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            expect(payload.deleted_at).toEqual(expect.any(String));
            expect(payload.deleted_by).toBe("user-1");
            expect(payload.archived_at).toBeNull();
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: null })),
              })),
            };
          }),
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    const result = await trashItem("person", "person-1");
    expect(result).toEqual({ success: true });
  });
});
