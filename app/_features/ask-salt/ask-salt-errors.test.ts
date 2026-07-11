import { afterEach, describe, expect, it, vi } from "vitest";
import {
  askSaltEmptyReplyFallback,
  resolveAskSaltClientError,
  resolveAskSaltServerStreamError,
} from "./ask-salt-errors";

describe("Ask Salt user-facing errors", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps context-size failures to new-chat guidance in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const message = resolveAskSaltClientError(
      new Error(
        "Request blocked by content filter: Request content exceeds maximum size for content filtering",
      ),
    );

    expect(message).toContain("new chat");
    expect(message).not.toContain("content filter");
  });

  it("falls back to generic copy for unknown provider errors in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const message = resolveAskSaltClientError(
      new Error("OpenRouter upstream failure: internal model routing error"),
    );

    expect(message).toBe("Something went wrong while Ask Salt was responding. Please try again.");
    expect(message).not.toContain("OpenRouter");
  });

  it("server stream errors include SALT reference IDs for unknown failures", () => {
    vi.stubEnv("NODE_ENV", "production");

    const message = resolveAskSaltServerStreamError(
      new Error("OpenRouter upstream failure: internal model routing error"),
      () => ({
        userMessage:
          "Something went wrong while Ask Salt was responding on our end. Please try again. If it keeps happening, contact support@usesalt.io and mention SALT-TEST1234.",
      }),
    );

    expect(message).toContain("SALT-TEST1234");
    expect(message).not.toContain("OpenRouter");
  });
});

describe("askSaltEmptyReplyFallback", () => {
  it("returns fallback copy when tool steps failed without assistant text", () => {
    expect(
      askSaltEmptyReplyFallback([
        { state: "output-available" },
        { state: "output-error" },
      ]),
    ).toContain("wasn't able to finish");
  });

  it("returns null when there are no failed tool steps", () => {
    expect(
      askSaltEmptyReplyFallback([{ state: "output-available" }]),
    ).toBeNull();
  });
});
