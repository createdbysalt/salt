import { describe, expect, it } from "vitest";
import { blueprintTags, playbookHeroEyebrow, playbookKindLabel } from "./playbook-display";

describe("playbookKindLabel", () => {
  it("maps acting to Action", () => {
    expect(playbookKindLabel("acting")).toBe("Action");
  });

  it("maps profile to Capture", () => {
    expect(playbookKindLabel("profile")).toBe("Capture");
  });
});

describe("playbookHeroEyebrow", () => {
  it("shows Memory Care play for memory-care profile playbooks", () => {
    expect(playbookHeroEyebrow("profile", "memory-care")).toBe("Memory Care play");
  });

  it("falls back to kind label for non-care profile playbooks", () => {
    expect(playbookHeroEyebrow("profile", "billing")).toBe("Capture playbook");
  });

  it("shows Action playbook for acting playbooks", () => {
    expect(playbookHeroEyebrow("acting", "billing")).toBe("Action playbook");
  });
});

describe("blueprintTags", () => {
  it("returns Auto-runs only for profile playbooks", () => {
    expect(blueprintTags([], "profile")).toEqual(["Auto-runs"]);
  });

  it("returns Needs approval for acting playbooks with required actions", () => {
    expect(blueprintTags(["GMAIL_SEND_EMAIL"], "acting")).toEqual(["Needs approval"]);
  });
});
