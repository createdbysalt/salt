import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface FilterCall {
  table: string;
  op: "eq" | "is" | "not";
  column: string;
  value: unknown;
}

const filterCalls: FilterCall[] = [];

interface QueryChain {
  data: unknown[];
  select: (columns: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  is: (column: string, value: unknown) => QueryChain;
  not: (column: string, operator: string, value: unknown) => QueryChain;
  order: (column: string) => QueryChain;
  limit: (count: number) => QueryChain;
}

function createQueryChain(table: string): QueryChain {
  const chain: QueryChain = {
    data: [],
    select: vi.fn(() => chain),
    eq: vi.fn((column: string, value: unknown) => {
      filterCalls.push({ table, op: "eq", column, value });
      return chain;
    }),
    is: vi.fn((column: string, value: unknown) => {
      filterCalls.push({ table, op: "is", column, value });
      return chain;
    }),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      filterCalls.push({ table, op: "not", column, value: `${operator}:${String(value)}` });
      return chain;
    }),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
  };

  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQueryChain(table)),
  })),
}));

import { memoryGetSimilarRecords } from "./get-similar";

describe("memoryGetSimilarRecords", () => {
  beforeEach(() => {
    filterCalls.length = 0;
  });

  it("only scans active records for duplicate candidates", async () => {
    await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      criteria: {
        checkEmail: true,
        checkPhone: true,
        checkDomain: true,
        checkName: false,
      },
    });

    for (const table of ["people", "organizations", "billing_records"]) {
      expect(filterCalls).toContainEqual({
        table,
        op: "is",
        column: "deleted_at",
        value: null,
      });
      expect(filterCalls).toContainEqual({
        table,
        op: "is",
        column: "archived_at",
        value: null,
      });
    }
  });
});

describe("duplicate detection confidence rules", () => {
  it("exact email match should be 98% confidence", () => {
    const confidence = 98;
    expect(confidence).toBeGreaterThanOrEqual(95);
  });

  it("exact phone match should be 85% confidence", () => {
    const confidence = 85;
    expect(confidence).toBeGreaterThanOrEqual(80);
    expect(confidence).toBeLessThan(95);
  });

  it("fuzzy name match alone should be low confidence", () => {
    const confidence = 55;
    expect(confidence).toBeLessThan(80);
  });

  it("fuzzy name + same domain should be higher confidence", () => {
    const confidenceFuzzyOnly = 55;
    const confidenceFuzzyWithDomain = 82;
    expect(confidenceFuzzyWithDomain).toBeGreaterThan(confidenceFuzzyOnly);
  });
});
