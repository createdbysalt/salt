import { describe, expect, it } from "vitest";
import { findNeverTouchConflict } from "./write-validation";
import {
  getFieldsForEntity,
  getWritePolicy,
} from "../taxonomy/field-registry";
import { MEMORY_CUSTOMIZE_ENTITY_TYPES } from "./default-guidance";

/**
 * Write-time validation (Phase M4): instructions that demand Salt write a
 * never-touch field are refused — the control couldn't compile to a real
 * mechanism.
 */
describe("findNeverTouchConflict", () => {
  it("refuses write intent against a user_only field", () => {
    // Every v1 type has at least one user_only field; use a real one.
    const type = MEMORY_CUSTOMIZE_ENTITY_TYPES.find((entityType) =>
      getFieldsForEntity(entityType).some(
        (f) => getWritePolicy(f) === "user_only",
      ),
    )!;
    const field = getFieldsForEntity(type).find(
      (f) => getWritePolicy(f) === "user_only",
    )!;
    const conflict = findNeverTouchConflict(
      type,
      `Always fill in ${field.label} from my emails`,
    );
    expect(conflict).toBe(field.label);
  });

  it("allows naming a never-touch field without write intent", () => {
    const type = MEMORY_CUSTOMIZE_ENTITY_TYPES.find((entityType) =>
      getFieldsForEntity(entityType).some(
        (f) => getWritePolicy(f) === "user_only",
      ),
    )!;
    const field = getFieldsForEntity(type).find(
      (f) => getWritePolicy(f) === "user_only",
    )!;
    expect(
      findNeverTouchConflict(type, `My ${field.label} is private, ask me first`),
    ).toBeNull();
  });

  it("allows ordinary guidance", () => {
    expect(
      findNeverTouchConflict("person", "Never treat my accountant as a client"),
    ).toBeNull();
    expect(
      findNeverTouchConflict("work", "Inquiries alone are not work"),
    ).toBeNull();
  });
});
