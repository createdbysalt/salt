import { describe, expect, it } from "vitest";
import { validateArgsAgainstJsonSchema } from "./json-schema-validate";

const SCHEMA = {
  type: "object",
  required: ["page_id"],
  properties: {
    page_id: { type: "string" },
    limit: { type: "integer" },
    include_archived: { type: "boolean" },
    tags: { type: "array" },
  },
};

describe("validateArgsAgainstJsonSchema", () => {
  it("accepts valid arguments", () => {
    const args = { page_id: "abc", limit: 10, include_archived: false };
    expect(validateArgsAgainstJsonSchema(args, SCHEMA, "TOOL")).toBe(args);
  });

  it("rejects missing required fields", () => {
    expect(() => validateArgsAgainstJsonSchema({ limit: 5 }, SCHEMA, "TOOL")).toThrow(
      /required argument 'page_id'/,
    );
  });

  it("rejects wrong primitive types", () => {
    expect(() =>
      validateArgsAgainstJsonSchema({ page_id: "abc", limit: "ten" }, SCHEMA, "TOOL"),
    ).toThrow(/must be of type integer/);
    expect(() =>
      validateArgsAgainstJsonSchema({ page_id: "abc", limit: 1.5 }, SCHEMA, "TOOL"),
    ).toThrow(/must be of type integer/);
  });

  it("rejects unknown fields only when additionalProperties is false", () => {
    const closed = { ...SCHEMA, additionalProperties: false };
    expect(() =>
      validateArgsAgainstJsonSchema({ page_id: "abc", extra: 1 }, closed, "TOOL"),
    ).toThrow(/Unknown argument 'extra'/);
    // Open schema tolerates extras.
    expect(
      validateArgsAgainstJsonSchema({ page_id: "abc", extra: 1 }, SCHEMA, "TOOL"),
    ).toBeTruthy();
  });

  it("fails closed on non-object args or missing schema", () => {
    expect(() => validateArgsAgainstJsonSchema("nope", SCHEMA, "TOOL")).toThrow(
      /must be a JSON object/,
    );
    expect(() => validateArgsAgainstJsonSchema({}, null, "TOOL")).toThrow(
      /No input schema available/,
    );
  });
});
