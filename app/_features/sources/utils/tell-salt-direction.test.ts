import { describe, expect, it } from "vitest";
import { extractDirection } from "./tell-salt-direction";

describe("extractDirection", () => {
  it("detects keep-out phrasing", () => {
    expect(extractDirection("keep out spammy-agency.com")).toEqual({
      direction: "deny",
      rest: "spammy-agency.com",
      phrase: "keep out",
    });
    expect(extractDirection("block invoices@spam.com")?.direction).toBe("deny");
    expect(extractDirection("drop @spammy-agency.com")?.direction).toBe("deny");
  });

  it("detects let-in phrasing", () => {
    expect(extractDirection("always let in accountant@firm.com")).toEqual({
      direction: "allow",
      rest: "accountant@firm.com",
      phrase: "always let in",
    });
    expect(extractDirection("let in @firm.com")?.direction).toBe("allow");
    expect(extractDirection("never miss @firm.com")?.direction).toBe("allow");
  });

  it("prefers the longest phrase — never let in is deny, not let in", () => {
    const result = extractDirection("never let in @spammy.com");
    expect(result?.direction).toBe("deny");
    expect(result?.rest).toBe("@spammy.com");
  });

  it("is case-insensitive and preserves the typed phrase", () => {
    const result = extractDirection("Keep Out spammy-agency.com");
    expect(result?.direction).toBe("deny");
    expect(result?.phrase).toBe("Keep Out");
  });

  it("returns null for bare values", () => {
    expect(extractDirection("spammy-agency.com")).toBeNull();
    expect(extractDirection("subject:invoice")).toBeNull();
  });

  it("returns null when the phrase has no target after it", () => {
    expect(extractDirection("keep out")).toBeNull();
    expect(extractDirection("keep out ")).toBeNull();
  });

  it("does not match partial words", () => {
    expect(extractDirection("blockchain@ledger.com")).toBeNull();
    expect(extractDirection("allowance notes")).toBeNull();
  });

  it("never maps watch language to a rule direction", () => {
    expect(extractDirection("watch @firm.com")).toBeNull();
  });
});
