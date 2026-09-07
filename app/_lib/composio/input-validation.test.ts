import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSyncedToolSchema: vi.fn(),
  pinnedSchemas: {} as Record<string, unknown>,
}));

vi.mock("./input-schema-store", () => ({
  getSyncedToolSchema: mocks.getSyncedToolSchema,
}));

vi.mock("./tool-policy", async () => {
  const { z } = await import("zod");
  return {
    composioToolInputSchemas: {
      // Passthrough shape-only schema (like STRIPE_LIST_CHARGES).
      LOOSE_TOOL: z.object({}).passthrough(),
      // Safety pin (like STRIPE_CREATE_INVOICE auto_advance: false).
      PINNED_SAFETY_TOOL: z
        .object({ auto_advance: z.literal(false).optional() })
        .passthrough(),
    },
  };
});

import { validateToolInputBoundary } from "./input-validation";

describe("validateToolInputBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates against the fresh synced schema first (source of truth)", async () => {
    mocks.getSyncedToolSchema.mockResolvedValue({
      toolkit: "slack",
      inputSchema: {
        type: "object",
        properties: { channel: { type: "string" } },
        required: ["channel"],
        additionalProperties: false,
      },
    });

    await expect(
      validateToolInputBoundary("LOOSE_TOOL", { channel: "#general" }),
    ).resolves.toEqual({ channel: "#general" });

    // Pinned passthrough would allow this unknown arg; the fresh schema
    // rejects it — the model gets corrected before the call leaves Salt.
    await expect(
      validateToolInputBoundary("LOOSE_TOOL", { channel: "#general", bogus: 1 }),
    ).rejects.toThrow(/Unknown argument 'bogus'/);
  });

  it("still applies pinned Zod safety pins on top of the synced schema", async () => {
    mocks.getSyncedToolSchema.mockResolvedValue({
      toolkit: "stripe",
      inputSchema: {
        type: "object",
        properties: { auto_advance: { type: "boolean" } },
      },
    });

    await expect(
      validateToolInputBoundary("PINNED_SAFETY_TOOL", { auto_advance: true }),
    ).rejects.toThrow();

    await expect(
      validateToolInputBoundary("PINNED_SAFETY_TOOL", { auto_advance: false }),
    ).resolves.toEqual({ auto_advance: false });
  });

  it("falls back to pinned Zod when no synced schema exists", async () => {
    mocks.getSyncedToolSchema.mockResolvedValue(null);

    await expect(
      validateToolInputBoundary("PINNED_SAFETY_TOOL", { auto_advance: true }),
    ).rejects.toThrow();
    await expect(
      validateToolInputBoundary("PINNED_SAFETY_TOOL", {}),
    ).resolves.toEqual({});
  });

  it("validates synced-only tools structurally (long tail)", async () => {
    mocks.getSyncedToolSchema.mockResolvedValue({
      toolkit: "notion",
      inputSchema: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
    });

    await expect(
      validateToolInputBoundary("NOTION_CREATE_PAGE", {}),
    ).rejects.toThrow(/Missing required argument 'title'/);
    await expect(
      validateToolInputBoundary("NOTION_CREATE_PAGE", { title: "Hi" }),
    ).resolves.toEqual({ title: "Hi" });
  });

  it("fails closed when no schema exists anywhere", async () => {
    mocks.getSyncedToolSchema.mockResolvedValue(null);

    await expect(
      validateToolInputBoundary("UNKNOWN_TOOL", {}),
    ).rejects.toThrow(/no input schema/i);
  });
});
