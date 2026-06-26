import { describe, expect, it } from "vitest";
import {
  createOrgInputSchema,
  createPersonInputSchema,
  createWorkInputSchema,
  updatePersonInputSchema,
} from "./schemas";

describe("system play schemas", () => {
  it("createPerson requires name or email", () => {
    expect(createPersonInputSchema.safeParse({}).success).toBe(false);
    expect(createPersonInputSchema.safeParse({ name: "Jane Doe" }).success).toBe(true);
    expect(
      createPersonInputSchema.safeParse({ email: "jane@acme.com" }).success,
    ).toBe(true);
  });

  it("createOrg requires name or domain", () => {
    expect(createOrgInputSchema.safeParse({}).success).toBe(false);
    expect(createOrgInputSchema.safeParse({ name: "Acme" }).success).toBe(true);
    expect(createOrgInputSchema.safeParse({ domain: "acme.com" }).success).toBe(true);
  });

  it("createWork requires name", () => {
    expect(createWorkInputSchema.safeParse({}).success).toBe(false);
    expect(createWorkInputSchema.safeParse({ name: "Website redesign" }).success).toBe(
      true,
    );
  });

  it("updatePerson requires at least one field", () => {
    expect(
      updatePersonInputSchema.safeParse({
        person_id: "11111111-1111-1111-1111-111111111111",
        fields: {},
      }).success,
    ).toBe(false);
    expect(
      updatePersonInputSchema.safeParse({
        person_id: "11111111-1111-1111-1111-111111111111",
        fields: { title: "CEO" },
      }).success,
    ).toBe(true);
  });
});
