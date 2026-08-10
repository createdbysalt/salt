import { describe, expect, it } from "vitest";
import {
  fromLearningDbEntityType,
  isLearningEntityType,
  toLearningDbEntityType,
} from "./entity-type";

describe("toLearningDbEntityType", () => {
  it("maps resource → file", () => {
    expect(toLearningDbEntityType("resource")).toBe("file");
  });

  it("passthroughs other Learning entity types", () => {
    expect(toLearningDbEntityType("person")).toBe("person");
    expect(toLearningDbEntityType("organization")).toBe("organization");
    expect(toLearningDbEntityType("work")).toBe("work");
    expect(toLearningDbEntityType("meeting")).toBe("meeting");
    expect(toLearningDbEntityType("billing")).toBe("billing");
    expect(toLearningDbEntityType("me")).toBe("me");
  });
});

describe("fromLearningDbEntityType", () => {
  it("maps file → resource", () => {
    expect(fromLearningDbEntityType("file")).toBe("resource");
  });

  it("accepts resource passthrough if already stored", () => {
    expect(fromLearningDbEntityType("resource")).toBe("resource");
  });

  it("passthroughs other known Learning entity types", () => {
    expect(fromLearningDbEntityType("person")).toBe("person");
    expect(fromLearningDbEntityType("organization")).toBe("organization");
  });

  it("returns null for unknown or empty values", () => {
    expect(fromLearningDbEntityType(null)).toBeNull();
    expect(fromLearningDbEntityType(undefined)).toBeNull();
    expect(fromLearningDbEntityType("")).toBeNull();
    expect(fromLearningDbEntityType("org")).toBeNull();
    expect(fromLearningDbEntityType("billing_record")).toBeNull();
  });
});

describe("isLearningEntityType", () => {
  it("accepts resource and rejects legacy file", () => {
    expect(isLearningEntityType("resource")).toBe(true);
    expect(isLearningEntityType("file")).toBe(false);
  });
});
