import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { fromMock, personMaybeSingle, meetingsHead, blockersQuery } = vi.hoisted(
  () => {
    const personMaybeSingle = vi.fn();
    const meetingsHead = vi.fn();
    const blockersLimit = vi.fn();
    const blockersQuery = {
      eq: vi.fn(),
      order: vi.fn(),
      limit: blockersLimit,
    };
    const fromMock = vi.fn();
    return { fromMock, personMaybeSingle, meetingsHead, blockersQuery };
  }
);

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import {
  fetchMemorySource,
  isMemoryFetchCategory,
} from "./memory-fetch";

describe("memory-fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes the memory category", () => {
    expect(isMemoryFetchCategory("memory")).toBe(true);
    expect(isMemoryFetchCategory("billing")).toBe(false);
  });

  it("rejects unknown capabilities", async () => {
    await expect(
      fetchMemorySource("ws-1", "nonsense", undefined, {})
    ).rejects.toThrow('Unknown memory capability "nonsense"');
  });

  describe("person_context", () => {
    function mockPersonQuery(person: Record<string, unknown> | null) {
      personMaybeSingle.mockResolvedValue({ data: person, error: null });
      fromMock.mockImplementation((table: string) => {
        if (table === "people") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({ maybeSingle: personMaybeSingle }),
                }),
              }),
            }),
          };
        }
        if (table === "meetings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({ limit: meetingsHead }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      });
    }

    it("returns a single context object for the triggered person", async () => {
      mockPersonQuery({
        id: "p-1",
        name: "Sarah",
        email: "sarah@acme.com",
        relationship_type: "client",
        relationship_status: "active",
        last_contact_at: "2026-07-01T00:00:00Z",
        first_contact_at: "2026-01-01T00:00:00Z",
        notes: "Likes async updates",
        relationship_health_band: "cooling",
        relationship_health_score: 55,
      });
      meetingsHead.mockResolvedValue({ count: 2 });

      const result = (await fetchMemorySource("ws-1", "person_context", undefined, {
        entityId: "p-1",
        entitySurface: "person",
      })) as Record<string, unknown>;

      expect(result.name).toBe("Sarah");
      expect(result.relationship_type).toBe("client");
      expect(result.recent_notes).toBe("Likes async updates");
      expect(result.has_calendar_meeting).toBe(true);
    });

    it("throws without a person entity in the trigger context", async () => {
      await expect(
        fetchMemorySource("ws-1", "person_context", undefined, {})
      ).rejects.toThrow("requires a person entity");
    });

    it("throws when the person is not in the workspace", async () => {
      mockPersonQuery(null);
      meetingsHead.mockResolvedValue({ count: 0 });

      await expect(
        fetchMemorySource("ws-1", "person_context", undefined, {
          entityId: "p-404",
          entitySurface: "person",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("silent_relationships", () => {
    it("returns people past the contact window with days computed", async () => {
      const thirtyOneDaysAgo = new Date(
        Date.now() - 31 * 24 * 60 * 60 * 1000
      ).toISOString();

      const limitMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: "p-1",
            name: "Quiet Client",
            relationship_type: "client",
            last_contact_at: thirtyOneDaysAgo,
          },
        ],
        error: null,
      });

      fromMock.mockImplementation((table: string) => {
        if (table !== "people") throw new Error(`unexpected table ${table}`);
        return {
          select: () => ({
            eq: () => ({
              lt: () => ({
                is: () => ({
                  is: () => ({
                    order: () => ({ limit: limitMock }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = (await fetchMemorySource(
        "ws-1",
        "silent_relationships",
        { days_since_contact: 30 },
        {}
      )) as Array<Record<string, unknown>>;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Quiet Client");
      expect(result[0].days_since_contact).toBe(31);
    });
  });

  describe("work_blocked", () => {
    function mockBlockers(rows: unknown[]) {
      const chain = {
        eq: vi.fn(),
        is: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      chain.eq.mockReturnValue(chain);
      chain.is.mockReturnValue(chain);
      chain.order.mockReturnValue(chain);
      chain.limit.mockResolvedValue({ data: rows, error: null });
      fromMock.mockImplementation((table: string) => {
        if (table !== "work_blockers") {
          throw new Error(`unexpected table ${table}`);
        }
        return { select: () => chain };
      });
    }

    it("returns a single object when scoped to a work entity", async () => {
      mockBlockers([
        {
          work_id: "w-1",
          title: "Waiting on assets",
          blocker_type: "client_dependency",
          detail: "Client owes brand assets",
          detected_at: "2026-08-01T00:00:00Z",
          work: { title: "Website redesign" },
        },
      ]);

      const result = (await fetchMemorySource("ws-1", "work_blocked", undefined, {
        entityId: "w-1",
        entitySurface: "work",
      })) as Record<string, unknown>;

      expect(result.name).toBe("Website redesign");
      expect(result.blocker_reason).toBe("Client owes brand assets");
    });

    it("throws when the signaled work has no unresolved blocker", async () => {
      mockBlockers([]);

      await expect(
        fetchMemorySource("ws-1", "work_blocked", undefined, {
          entityId: "w-9",
          entitySurface: "work",
        })
      ).rejects.toThrow("no unresolved blocker");
    });
  });
});
