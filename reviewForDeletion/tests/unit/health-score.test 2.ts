import { describe, it, expect } from "@jest/globals";
import { calculateClientHealthScore } from "@/app/actions/clients/calculate-health-score";

// Mock Supabase client
jest.mock("@/libs/supabase/server", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: "test-client",
              studio_id: "test-studio",
              status: "active",
              last_contact_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            },
          })),
          in: jest.fn(() => ({ data: [] })),
          lt: jest.fn(() => ({ data: [] })),
          gte: jest.fn(() => ({ data: [], count: 0 })),
          lte: jest.fn(() => ({ data: [], count: 0 })),
        })),
      })),
    })),
  })),
}));

describe("calculateClientHealthScore", () => {
  it("should return a score between 0 and 100", async () => {
    const result = await calculateClientHealthScore("test-client");
    
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should return an array of factors", async () => {
    const result = await calculateClientHealthScore("test-client");
    
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("should have factors with required properties", async () => {
    const result = await calculateClientHealthScore("test-client");
    
    result.factors.forEach((factor) => {
      expect(factor).toHaveProperty("factor");
      expect(factor).toHaveProperty("impact");
      expect(factor).toHaveProperty("reason");
      expect(typeof factor.factor).toBe("string");
      expect(typeof factor.impact).toBe("number");
      expect(typeof factor.reason).toBe("string");
    });
  });

  it("should penalize for no last contact", async () => {
    const result = await calculateClientHealthScore("test-client");
    
    const contactFactor = result.factors.find((f) => f.factor === "Last Contact");
    expect(contactFactor).toBeDefined();
    expect(contactFactor!.impact).toBeLessThan(0);
  });
});

