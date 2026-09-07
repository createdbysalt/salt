import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSyncedToolSchema: vi.fn(),
}));

vi.mock("@/app/_lib/composio/input-schema-store", () => ({
  getSyncedToolSchema: mocks.getSyncedToolSchema,
}));

import {
  stableStringify,
  hashToolSchema,
  hydrateToolSchemas,
} from "./schema-hydration";

describe("stableStringify", () => {
  it("is deterministic regardless of key order", () => {
    const a = { b: 1, a: { d: [1, 2], c: "x" } };
    const b = { a: { c: "x", d: [1, 2] }, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("distinguishes different values", () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });
});

describe("hashToolSchema", () => {
  it("produces a stable short hash for a schema", () => {
    const schema = {
      type: "object",
      properties: { limit: { type: "integer" } },
      required: [],
    };
    const hash1 = hashToolSchema(schema);
    const hash2 = hashToolSchema({
      required: [],
      properties: { limit: { type: "integer" } },
      type: "object",
    });
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{16}$/);
  });

  it("changes when the schema changes (vendor drift detection)", () => {
    const before = { type: "object", properties: { limit: { type: "integer" } } };
    const after = { type: "object", properties: { limit: { type: "string" } } };
    expect(hashToolSchema(before)).not.toBe(hashToolSchema(after));
  });
});

describe("hydrateToolSchemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates slugs that have synced schemas, with hashes", async () => {
    mocks.getSyncedToolSchema.mockImplementation(async (slug: string) =>
      slug === "STRIPE_LIST_CHARGES"
        ? { toolkit: "stripe", inputSchema: { type: "object", properties: {} } }
        : null,
    );

    const hydrated = await hydrateToolSchemas([
      "STRIPE_LIST_CHARGES",
      "UNSYNCED_TOOL",
    ]);

    expect(hydrated.size).toBe(1);
    const entry = hydrated.get("STRIPE_LIST_CHARGES");
    expect(entry?.slug).toBe("STRIPE_LIST_CHARGES");
    expect(entry?.schemaHash).toMatch(/^[0-9a-f]{16}$/);
    expect(entry?.inputSchema).toEqual({ type: "object", properties: {} });
  });

  it("returns an empty map when nothing is synced", async () => {
    mocks.getSyncedToolSchema.mockResolvedValue(null);
    const hydrated = await hydrateToolSchemas(["A", "B"]);
    expect(hydrated.size).toBe(0);
  });

  it("dedupes slugs", async () => {
    mocks.getSyncedToolSchema.mockResolvedValue({
      toolkit: "stripe",
      inputSchema: { type: "object" },
    });
    await hydrateToolSchemas(["A", "A", "A"]);
    expect(mocks.getSyncedToolSchema).toHaveBeenCalledTimes(1);
  });
});
