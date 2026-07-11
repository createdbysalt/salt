import { describe, expect, it, vi } from "vitest";
import {
  isSaltUserFacingMessage,
  looksLikeProviderError,
  matchKnownProviderError,
  sanitizeProviderErrorForUser,
} from "./provider-errors";

describe("provider error sanitization", () => {
  it("detects raw provider errors", () => {
    expect(
      looksLikeProviderError(
        "Request blocked by content filter: Request content exceeds maximum size for content filtering",
      ),
    ).toBe(true);
    expect(looksLikeProviderError("Something went wrong on our end. Please try again.")).toBe(
      false,
    );
  });

  it("recognizes Salt-safe messages", () => {
    expect(
      isSaltUserFacingMessage(
        "Something went wrong while Ask Salt was responding. Please try again. If it keeps happening, contact support@usesalt.io and mention SALT-ABC12345.",
      ),
    ).toBe(true);
  });

  it("maps known provider patterns to actionable copy", () => {
    const match = matchKnownProviderError("Rate limit exceeded (429)");
    expect(match?.message).toContain("too many requests");
  });

  it("never returns raw provider text in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const message = sanitizeProviderErrorForUser(
      new Error(
        "Request blocked by content filter: Request content exceeds maximum size for content filtering",
      ),
    );

    expect(message).not.toContain("content filter");
    expect(message).not.toContain("OpenRouter");

    vi.unstubAllEnvs();
  });

  it("allows product-specific overrides", () => {
    vi.stubEnv("NODE_ENV", "production");

    const message = sanitizeProviderErrorForUser(
      new Error("context length exceeded maximum"),
      {
        matchProductError: () => "Start a new chat and ask again.",
      },
    );

    expect(message).toBe("Start a new chat and ask again.");

    vi.unstubAllEnvs();
  });
});
