import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, newErrorRef, reportError, safeUserMessage } from "./index";
import { logger } from "@/app/_lib/logger";

describe("safe error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates short Salt reference IDs", () => {
    const ref = newErrorRef();

    expect(ref).toMatch(/^SALT-[A-F0-9]{8}$/);
  });

  it("returns a user-safe message without raw backend details", () => {
    const message = safeUserMessage({
      errorId: "SALT-ABC12345",
      action: "while creating that work item",
    });

    expect(message).toContain("SALT-ABC12345");
    expect(message).toContain("support@usesalt.io");
    expect(message).not.toContain("null value in column");
    expect(message).not.toContain("projects");
  });

  it("logs raw details while returning a safe message", () => {
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const rawError = new Error('null value in column "slug" violates not-null constraint');

    const report = reportError({
      scope: "ask-salt",
      error: rawError,
      errorId: "SALT-ABC12345",
      context: { workspaceId: "workspace_123" },
      action: "while creating that work item",
    });

    expect(report.errorId).toBe("SALT-ABC12345");
    expect(report.userMessage).toContain("SALT-ABC12345");
    expect(report.userMessage).not.toContain("slug");
    expect(loggerSpy).toHaveBeenCalledWith(
      "[ask-salt] SALT-ABC12345",
      rawError,
      expect.objectContaining({
        errorId: "SALT-ABC12345",
        workspaceId: "workspace_123",
      }),
    );
  });

  it("can surface explicitly safe AppError copy", () => {
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const report = reportError({
      scope: "auth",
      error: new AppError({
        code: "AUTHORIZATION_ERROR",
        message: "Missing workspace membership",
        userMessage: "You do not have permission to do that.",
      }),
      errorId: "SALT-DEF67890",
    });

    expect(report.userMessage).toContain("You do not have permission to do that.");
    expect(report.userMessage).not.toContain("Missing workspace membership");
    expect(loggerSpy).toHaveBeenCalledOnce();
  });
});
