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
  it("shows Keeper play for keeper profile playbooks", () => {
    expect(playbookHeroEyebrow("profile", "keeper")).toBe("Keeper play");
  });

  it("falls back to kind label for non-keeper profile playbooks", () => {
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
