import { describe, expect, it } from "vitest";
import { schemaHash } from "./catalog-sync-hash";

describe("schema hash (drift comparison)", () => {
  it("is stable across key ordering", () => {
    const a = schemaHash({ b: 1, a: { d: 2, c: 3 } }, null);
    const b = schemaHash({ a: { c: 3, d: 2 }, b: 1 }, null);
    expect(a).toBe(b);
  });

  it("changes when a schema field changes", () => {
    const a = schemaHash({ properties: { q: { type: "string" } } }, null);
    const b = schemaHash({ properties: { q: { type: "number" } } }, null);
    expect(a).not.toBe(b);
  });

  it("distinguishes input changes from output changes", () => {
    const a = schemaHash({ x: 1 }, { y: 2 });
    const b = schemaHash({ x: 1 }, { y: 3 });
    expect(a).not.toBe(b);
  });
});
