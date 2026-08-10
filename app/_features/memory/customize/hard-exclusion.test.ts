import { describe, expect, it } from "vitest";
import { detectHardExclusion } from "./hard-exclusion";

/**
 * Track B (Phase M4): a hard-exclusion entry ("never let in anything from
 * @spammy-agency.com") compiles to a workspace deny rule — dependable, not
 * prompt theater. Entries that express a generalization instead ("never
 * treat my accountant as a client") stay prompt-only guidance.
 */
describe("detectHardExclusion", () => {
  it("compiles 'never … from @domain' to a domain exclusion", () => {
    expect(
      detectHardExclusion("never let in anything from @spammy-agency.com"),
    ).toEqual({
      entityType: "domain",
      entityKey: "spammy-agency.com",
      preview: expect.stringContaining("spammy-agency.com"),
    });
  });

  it("compiles 'keep out <email>' to a sender exclusion", () => {
    const hit = detectHardExclusion("keep out newsletters@spammy.io");
    expect(hit?.entityType).toBe("sender_email");
    expect(hit?.entityKey).toBe("newsletters@spammy.io");
  });

  it("compiles \"don't watch <glob>\" to a pattern exclusion", () => {
    const hit = detectHardExclusion("don't watch *invoice*");
    expect(hit?.entityType).toBe("sender_pattern");
    expect(hit?.entityKey).toBe("*invoice*");
  });

  it("compiles 'block <domain>' phrasing", () => {
    const hit = detectHardExclusion("block spammy-agency.com");
    expect(hit?.entityType).toBe("domain");
  });

  it("returns null for generalizations (prompt-only guidance)", () => {
    expect(
      detectHardExclusion("never treat my accountant as a client"),
    ).toBeNull();
    expect(
      detectHardExclusion("never create Work records from inquiry emails"),
    ).toBeNull();
  });

  it("returns null for plain statements (no exclusion intent)", () => {
    expect(detectHardExclusion("accountants are not clients")).toBeNull();
    expect(detectHardExclusion("I mostly work with breweries")).toBeNull();
  });

  it("returns null when the exclusion has no parseable target", () => {
    expect(detectHardExclusion("never let in junk")).toBeNull();
    expect(detectHardExclusion("never")).toBeNull();
  });
});
