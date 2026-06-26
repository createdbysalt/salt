import { describe, expect, it } from "vitest";
import { buildPlaysPath, playsTabCacheKey } from "./plays-tab-routing";

describe("plays tab routing helpers", () => {
  it("builds cache keys per tab", () => {
    expect(playsTabCacheKey("queue", "actions")).toBe("queue");
    expect(playsTabCacheKey("activity", "captures")).toBe("activity:captures");
  });

  it("builds shareable plays URLs", () => {
    expect(buildPlaysPath("queue", "needs_you", "actions")).toBe("/plays");
    expect(buildPlaysPath("activity", "needs_you", "captures")).toBe(
      "/plays?tab=activity&view=captures",
    );
    expect(buildPlaysPath("queue", "auto_handled", "actions")).toBe("/plays?filter=auto_handled");
  });
});
