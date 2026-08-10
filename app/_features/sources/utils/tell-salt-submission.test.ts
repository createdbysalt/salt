import { describe, expect, it } from "vitest";
import { planTellSaltSubmission } from "./tell-salt-submission";

describe("planTellSaltSubmission", () => {
  it("confirms a deterministically parsed value", () => {
    expect(planTellSaltSubmission("spammy-agency.com", "email")).toEqual({
      kind: "confirm-rule",
      entityType: "domain",
      entityKey: "spammy-agency.com",
      preview: "Domain · everyone at spammy-agency.com",
    });
  });

  it("confirms prefixed values", () => {
    expect(planTellSaltSubmission("subject:invoice", "email")).toMatchObject({
      kind: "confirm-rule",
      entityType: "subject_pattern",
      entityKey: "*invoice*",
    });
  });

  it("sends sentence-shaped input to the compiler", () => {
    expect(
      planTellSaltSubmission("keep out anything from spammy agencies", "email"),
    ).toEqual({ kind: "compile" });
  });

  it("keeps unparseable fragments as hints — never a guess", () => {
    const result = planTellSaltSubmission("spammy", "email");
    expect(result.kind).toBe("hint");
    if (result.kind === "hint") {
      expect(result.hint.length).toBeGreaterThan(0);
    }
  });

  it("empty input is a hint, not a compile", () => {
    expect(planTellSaltSubmission("   ", "email").kind).toBe("hint");
  });
});
