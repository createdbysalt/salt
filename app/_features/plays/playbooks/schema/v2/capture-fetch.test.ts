import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/app/_features/capture/services/relationship-discovery", () => ({
  listHeldSenders: vi.fn().mockResolvedValue([]),
}));

const { fromMock, capturesLimit, capturedFilters } = vi.hoisted(() => {
  const capturesLimit = vi.fn();
  const capturedFilters: {
    eq: Array<[string, unknown]>;
    in: Array<[string, unknown]>;
    gte: Array<[string, unknown]>;
  } = { eq: [], in: [], gte: [] };

  const fromMock = vi.fn().mockImplementation(() => ({
    select: () => ({
      eq: (col: string, val: unknown) => {
        capturedFilters.eq.push([col, val]);
        return {
          in: (col: string, val: unknown) => {
            capturedFilters.in.push([col, val]);
            return {
              eq: (col2: string, val2: unknown) => {
                capturedFilters.eq.push([col2, val2]);
                return {
                  in: (col3: string, val3: unknown) => {
                    capturedFilters.in.push([col3, val3]);
                    return {
                      gte: (col4: string, val4: unknown) => {
                        capturedFilters.gte.push([col4, val4]);
                        return {
                          order: () => ({ limit: capturesLimit }),
                        };
                      },
                    };
                  },
                  gte: (col3: string, val3: unknown) => {
                    capturedFilters.gte.push([col3, val3]);
                    return { order: () => ({ limit: capturesLimit }) };
                  },
                };
              },
            };
          },
        };
      },
    }),
  }));

  return { fromMock, capturesLimit, capturedFilters };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { fetchCaptureSource, isCaptureFetchCategory } from "./capture-fetch";

describe("capture-fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFilters.eq.length = 0;
    capturedFilters.in.length = 0;
    capturedFilters.gte.length = 0;
  });

  it("recognizes the capture category", () => {
    expect(isCaptureFetchCategory("capture")).toBe(true);
    expect(isCaptureFetchCategory("memory")).toBe(false);
  });

  it("rejects unknown capabilities", async () => {
    await expect(
      fetchCaptureSource("ws-1", "nonsense", undefined)
    ).rejects.toThrow('Unknown capture capability "nonsense"');
  });

  describe("reply_candidates", () => {
    it("filters to surface_now + reply-shaped categories and maps rows", async () => {
      capturesLimit.mockResolvedValue({
        data: [
          {
            id: "c-1",
            created_at: "2026-08-01T10:00:00Z",
            extracted_data: {
              subject: "Proposal question",
              body_preview: "Can you send over the…",
              sender: { name: "Alex", email: "alex@client.com" },
              thread_id: "thread-9",
              deep_link: "https://mail.google.com/mail/u/0/#inbox/thread-9",
            },
            enriched_metadata: {
              email_classification: { category: "action_required" },
            },
          },
        ],
        error: null,
      });

      const result = (await fetchCaptureSource("ws-1", "reply_candidates", {
        days: 7,
        limit: 10,
      })) as Array<Record<string, unknown>>;

      expect(capturedFilters.eq).toContainEqual([
        "enriched_metadata->email_classification->>triage_action",
        "surface_now",
      ]);
      expect(capturedFilters.in).toContainEqual([
        "enriched_metadata->email_classification->>category",
        ["action_required", "opportunities"],
      ]);
      expect(capturesLimit).toHaveBeenCalledWith(10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        capture_id: "c-1",
        subject: "Proposal question",
        sender_email: "alex@client.com",
        sender_name: "Alex",
        thread_id: "thread-9",
        category: "action_required",
      });
    });

    it("returns an empty list when nothing matches", async () => {
      capturesLimit.mockResolvedValue({ data: [], error: null });

      const result = await fetchCaptureSource("ws-1", "reply_candidates", undefined);
      expect(result).toEqual([]);
    });

    it("throws when the query fails", async () => {
      capturesLimit.mockResolvedValue({ data: null, error: { message: "boom" } });

      await expect(
        fetchCaptureSource("ws-1", "reply_candidates", undefined)
      ).rejects.toThrow("Failed to load reply candidates: boom");
    });
  });
});
