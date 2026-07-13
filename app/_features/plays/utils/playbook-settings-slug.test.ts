import { describe, expect, it } from "vitest";
import { resolvePlaybookSettingsSlug } from "./playbook-settings-slug";

describe("resolvePlaybookSettingsSlug", () => {
  it("maps old per-entity-type slugs to unified memory-records", () => {
    expect(resolvePlaybookSettingsSlug("people-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("keeper-people-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("keeper-organizations-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("keeper-work-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("keeper-billing-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("keeper-files-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("keeper-meetings-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("relationships-keeper")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("convos-keeper")).toBe("memory-records");
  });

  it("returns slug unchanged when no mapping exists", () => {
    expect(resolvePlaybookSettingsSlug("invoice-reminder")).toBe("invoice-reminder");
    expect(resolvePlaybookSettingsSlug("memory-records")).toBe("memory-records");
    expect(resolvePlaybookSettingsSlug("some-other-playbook")).toBe("some-other-playbook");
  });
});
