import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateClientHealthScore } from "@/app/_features/people/actions/clients/calculate-health-score";

// Create a fluent mock builder
const createQueryMock = (defaultData: unknown = null, defaultCount: number | null = null) => {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainable = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: defaultData, error: null }),
    then: vi.fn((cb) => Promise.resolve(cb({ data: defaultData, error: null, count: defaultCount }))),
  });

  return chainable();
};

// Mock Supabase client
vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn((table: string) => {
        // Return appropriate mock data based on table
        if (table === "clients") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "test-client",
                    workspace_id: "test-studio",
                    status: "active",
                    last_contact_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        // Default empty results for other tables
        return createQueryMock([], 0);
      }),
    })
  ),
}));

describe("calculateClientHealthScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a score between 0 and 100", async () => {
    const result = await calculateClientHealthScore("test-client");

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should return an array of factors", async () => {
    const result = await calculateClientHealthScore("test-client");

    expect(Array.isArray(result.factors)).toBe(true);
  });

  it("should have factors with required properties when present", async () => {
    const result = await calculateClientHealthScore("test-client");

    if (result.factors.length > 0) {
      result.factors.forEach((factor) => {
        expect(factor).toHaveProperty("factor");
        expect(factor).toHaveProperty("impact");
        expect(factor).toHaveProperty("reason");
        expect(typeof factor.factor).toBe("string");
        expect(typeof factor.impact).toBe("number");
        expect(typeof factor.reason).toBe("string");
      });
    }
  });

  it("should return a valid health score result structure", async () => {
    const result = await calculateClientHealthScore("test-client");

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("factors");
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.factors)).toBe(true);
  });
});
