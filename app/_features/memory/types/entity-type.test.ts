import { describe, expect, it } from "vitest";
import {
  fromDbEntityType,
  isMemoryEntityType,
  toDbEntityType,
} from "./entity-type";

describe("toDbEntityType", () => {
  it("maps resource → file in every dialect (short-dialect CHECK)", () => {
    expect(toDbEntityType("resource", "short")).toBe("file");
    expect(toDbEntityType("resource", "provenance")).toBe("file");
    expect(toDbEntityType("resource", "relations")).toBe("file");
  });

  it("keeps other short-dialect types unchanged", () => {
    expect(toDbEntityType("person", "short")).toBe("person");
    expect(toDbEntityType("org", "short")).toBe("org");
  });

  it("maps org → organization in provenance", () => {
    expect(toDbEntityType("org", "provenance")).toBe("organization");
  });
});

describe("fromDbEntityType", () => {
  it("maps file → resource", () => {
    expect(fromDbEntityType("file")).toBe("resource");
  });

  it("maps organization → org and billing_record → billing", () => {
    expect(fromDbEntityType("organization")).toBe("org");
    expect(fromDbEntityType("billing_record")).toBe("billing");
  });

  it("rejects unknown spellings", () => {
    expect(fromDbEntityType("widget")).toBeNull();
    expect(fromDbEntityType(null)).toBeNull();
  });
});

describe("isMemoryEntityType", () => {
  it("accepts resource and rejects legacy file", () => {
    expect(isMemoryEntityType("resource")).toBe(true);
    expect(isMemoryEntityType("file")).toBe(false);
  });
});
