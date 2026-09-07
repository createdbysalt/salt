import { describe, it, expect } from "vitest";
import { compactInputSchema } from "./compact-schema";

describe("compactInputSchema", () => {
  it("projects properties with type, required flag, and description", () => {
    const schema = {
      type: "object",
      properties: {
        title: { type: "string", description: "Page title" },
        archived: { type: "boolean" },
      },
      required: ["title"],
    };

    expect(compactInputSchema(schema)).toEqual({
      title: { type: "string", required: true, description: "Page title" },
      archived: { type: "boolean", required: false },
    });
  });

  it("includes enum values (capped) so the model never invents them", () => {
    const schema = {
      type: "object",
      properties: {
        color: { type: "string", enum: ["red", "blue", "green"] },
      },
    };

    expect(compactInputSchema(schema)).toEqual({
      color: { type: "string", required: false, enum: ["red", "blue", "green"] },
    });
  });

  it("marks nested objects/arrays by type only (shallow projection)", () => {
    const schema = {
      type: "object",
      properties: {
        filter: { type: "object", properties: { deep: { type: "string" } } },
        tags: { type: "array", items: { type: "string" } },
      },
    };

    expect(compactInputSchema(schema)).toEqual({
      filter: { type: "object", required: false },
      tags: { type: "array", required: false },
    });
  });

  it("truncates long descriptions", () => {
    const schema = {
      type: "object",
      properties: {
        body: { type: "string", description: "x".repeat(300) },
      },
    };

    const compact = compactInputSchema(schema);
    const description = compact?.body?.description ?? "";
    expect(description.length).toBeLessThanOrEqual(120);
  });

  it("caps the number of properties to bound context cost", () => {
    const properties: Record<string, { type: string }> = {};
    for (let i = 0; i < 40; i += 1) {
      properties[`field_${i}`] = { type: "string" };
    }

    const compact = compactInputSchema({ type: "object", properties });
    expect(Object.keys(compact ?? {}).length).toBeLessThanOrEqual(20);
  });

  it("returns null for non-object or property-less schemas", () => {
    expect(compactInputSchema(null)).toBeNull();
    expect(compactInputSchema("string")).toBeNull();
    expect(compactInputSchema({ type: "object" })).toBeNull();
    expect(compactInputSchema({ type: "string" })).toBeNull();
  });
});
