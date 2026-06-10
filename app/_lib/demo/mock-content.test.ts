import { describe, expect, it } from "vitest";
import {
  getMockContentAccountEmail,
  isMockContentAccountEmail,
  resolveMockContentEnabled,
} from "./mock-content";

describe("mock-content", () => {
  it("defaults to the dev studio account email", () => {
    expect(getMockContentAccountEmail()).toBe("test-studio@saltcore.dev");
  });

  it("matches email case-insensitively", () => {
    expect(isMockContentAccountEmail("Test-Studio@SaltCore.Dev")).toBe(true);
    expect(isMockContentAccountEmail("other@example.com")).toBe(false);
  });

  it("disables mock content for all accounts", () => {
    expect(
      resolveMockContentEnabled({ email: "test-studio@saltcore.dev" }),
    ).toBe(false);
    expect(resolveMockContentEnabled({ email: "real@usesalt.io" })).toBe(
      false,
    );
  });
});
