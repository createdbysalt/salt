import { describe, expect, it } from "vitest";
import {
  assertPlayRunTransition,
  canTransitionPlayRun,
  nextStateForAction,
} from "./play-state-machine";

describe("play-state-machine", () => {
  it("allows queued → approved", () => {
    expect(canTransitionPlayRun("queued", "approved")).toBe(true);
    expect(nextStateForAction("approve", "queued")).toBe("approved");
  });

  it("allows queued → dismissed", () => {
    expect(nextStateForAction("dismiss", "queued")).toBe("dismissed");
  });

  it("blocks ran → queued", () => {
    expect(canTransitionPlayRun("ran", "queued")).toBe(false);
    expect(() => assertPlayRunTransition("ran", "queued")).toThrow(
      /Invalid play run transition/,
    );
  });

  it("allows approved → ran", () => {
    expect(nextStateForAction("mark_ran", "approved")).toBe("ran");
  });

  it("allows queued → scheduled", () => {
    expect(nextStateForAction("schedule", "queued")).toBe("scheduled");
  });

  describe("executor states", () => {
    it("allows approved → executing and scheduled → executing", () => {
      expect(canTransitionPlayRun("approved", "executing")).toBe(true);
      expect(canTransitionPlayRun("scheduled", "executing")).toBe(true);
    });

    it("blocks executing from non-claimable states", () => {
      expect(canTransitionPlayRun("draft", "executing")).toBe(false);
      expect(canTransitionPlayRun("queued", "executing")).toBe(false);
      expect(canTransitionPlayRun("ran", "executing")).toBe(false);
      expect(canTransitionPlayRun("dismissed", "executing")).toBe(false);
    });

    it("allows executing → ran, failed, and dismissed (guard skip)", () => {
      expect(canTransitionPlayRun("executing", "ran")).toBe(true);
      expect(canTransitionPlayRun("executing", "failed")).toBe(true);
      expect(canTransitionPlayRun("executing", "dismissed")).toBe(true);
    });

    it("allows failed → queued (retry) and failed → dismissed", () => {
      expect(canTransitionPlayRun("failed", "queued")).toBe(true);
      expect(canTransitionPlayRun("failed", "dismissed")).toBe(true);
    });

    it("keeps ran and dismissed terminal", () => {
      expect(canTransitionPlayRun("ran", "failed")).toBe(false);
      expect(canTransitionPlayRun("dismissed", "queued")).toBe(false);
      expect(() => assertPlayRunTransition("ran", "executing")).toThrow(
        /Invalid play run transition/,
      );
    });
  });
});
