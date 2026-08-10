import { describe, expect, it } from "vitest";
import { runPlaybookIntake } from "./intake-tools";

describe("runPlaybookIntake", () => {
  it("parses Jane Example + project from casual phrasing", () => {
    const result = runPlaybookIntake(
      "memory-records",
      "okay add Jane Example. we're working on a project for her.",
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    const person = result.entities.find((e) => e.type === "person");
    const work = result.entities.find((e) => e.type === "work");

    expect(person?.name).toBe("Jane Example");
    expect(work?.name).toBe("Project for Jane Example");
    expect(result.isMultiEntity).toBe(true);
    expect(result.creationOrder.map((entity) => entity.type)).toEqual(["person", "work"]);
    expect(result.guidance).toContain("memory_create_work");
    expect(result.guidance).toContain("memory_link_person_work");
  });

  it("parses exact lowercase user phrasing", () => {
    const result = runPlaybookIntake(
      "memory-records",
      "add jane example we're working on a project for her.",
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.creationOrder.map((entity) => entity.type)).toEqual(["person", "work"]);
    expect(result.entities.find((entity) => entity.type === "work")?.name).toBe(
      "Project for Jane Example",
    );
  });

  it("accepts memory-care intake id", () => {
    const result = runPlaybookIntake("memory-care", "add Jane Doe");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.intakeId).toBe("memory-care");
  });

  it("rejects unknown intake id", () => {
    const result = runPlaybookIntake("invoice-reminder", "add Jane");
    expect(result.success).toBe(false);
  });
});
