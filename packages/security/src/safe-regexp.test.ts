import { describe, expect, it } from "vitest";
import {
  isValidSenderGlobPattern,
  matchesSenderGlobPattern,
} from "./safe-regexp";

describe("sender glob patterns", () => {
  it("accepts valid glob patterns", () => {
    expect(isValidSenderGlobPattern("*noreply*")).toBe(true);
    expect(isValidSenderGlobPattern("newsletter?@example.com")).toBe(true);
  });

  it("rejects invalid or oversized patterns", () => {
    expect(isValidSenderGlobPattern("   ")).toBe(false);
    expect(isValidSenderGlobPattern("[regex]")).toBe(false);
    expect(isValidSenderGlobPattern("a".repeat(257))).toBe(false);
  });

  it("matches wildcard substrings", () => {
    expect(matchesSenderGlobPattern("*noreply*", "Noreply Bot")).toBe(true);
    expect(matchesSenderGlobPattern("news*", "Newsletter Team")).toBe(true);
    expect(matchesSenderGlobPattern("news*", "Billing Team")).toBe(false);
  });

  it("matches single-character wildcards", () => {
    expect(matchesSenderGlobPattern("a?c", "abc")).toBe(true);
    expect(matchesSenderGlobPattern("a?c", "ac")).toBe(false);
  });
});
