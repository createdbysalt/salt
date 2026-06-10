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
});
