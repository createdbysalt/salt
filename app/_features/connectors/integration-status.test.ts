import { describe, expect, it } from "vitest";
import {
  getCalcomStatusLabel,
  getFirefliesStatusLabel,
  isApiKeyIntegrationConnected,
} from "./integration-status";

describe("isApiKeyIntegrationConnected", () => {
  it("returns false when row is missing", () => {
    expect(isApiKeyIntegrationConnected(null)).toBe(false);
  });

  it("returns false when active but credentials are missing", () => {
    expect(
      isApiKeyIntegrationConnected({
        is_active: true,
        api_key_encrypted: null,
      }),
    ).toBe(false);
  });

  it("returns true when active and encrypted credentials exist", () => {
    expect(
      isApiKeyIntegrationConnected({
        is_active: true,
        api_key_encrypted: "encrypted",
      }),
    ).toBe(true);
  });
});

describe("status labels", () => {
  it("formats calcom username", () => {
    expect(getCalcomStatusLabel({ username: "maya" })).toBe("@maya");
  });

  it("formats fireflies bot email", () => {
    expect(getFirefliesStatusLabel({ botEmail: "bot@fireflies.ai" })).toBe(
      "bot@fireflies.ai",
    );
  });
});
