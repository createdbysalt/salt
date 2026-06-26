import { describe, expect, it } from "vitest";
import { blueprintTags, playbookKindLabel } from "./playbook-display";

describe("playbookKindLabel", () => {
  it("maps acting to Action", () => {
    expect(playbookKindLabel("acting")).toBe("Action");
  });

  it("maps profile to Capture", () => {
    expect(playbookKindLabel("profile")).toBe("Capture");
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
