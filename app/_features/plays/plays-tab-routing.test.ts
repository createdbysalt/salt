import { describe, expect, it } from "vitest";
import {
  buildPlaysPath,
  parsePlaysQueueFilter,
  resolvePlaysLegacyRedirect,
} from "./plays-tab-routing";

describe("plays tab routing helpers", () => {
  it("builds shareable plays URLs", () => {
    expect(buildPlaysPath("queue", "needs_you")).toBe("/plays");
    expect(buildPlaysPath("playbooks", "needs_you")).toBe("/plays?tab=playbooks");
    expect(buildPlaysPath("activity", "needs_you")).toBe("/plays?tab=activity");
    expect(buildPlaysPath("queue", "auto_handled")).toBe("/plays?filter=auto_handled");
  });

  it("parses queue filter with safe default", () => {
    expect(parsePlaysQueueFilter(null)).toBe("needs_you");
    expect(parsePlaysQueueFilter("auto_handled")).toBe("auto_handled");
    expect(parsePlaysQueueFilter("learning")).toBe("needs_you");
  });

  it("redirects legacy customize URLs", () => {
    expect(resolvePlaysLegacyRedirect({ tab: "customize" })).toBe("/plays?tab=playbooks");
    expect(resolvePlaysLegacyRedirect({ tab: "customize", customize: "connectors" })).toBe(
      "/sources",
    );
    expect(
      resolvePlaysLegacyRedirect({ tab: "customize", connector: "gmail" }),
    ).toBe("/sources?connector=gmail");
    expect(resolvePlaysLegacyRedirect({ tab: "customize", customize: "voices" })).toBe(
      "/me?tab=voice",
    );
  });

  it("redirects legacy stream and learning URLs", () => {
    expect(resolvePlaysLegacyRedirect({ tab: "activity", view: "captures" })).toBe(
      "/sources?tab=activity",
    );
    expect(resolvePlaysLegacyRedirect({ view: "stream" })).toBe("/sources?tab=activity");
    expect(resolvePlaysLegacyRedirect({ filter: "learning" })).toBe("/memory?tab=activity");
  });

  it("leaves canonical URLs untouched", () => {
    expect(resolvePlaysLegacyRedirect({})).toBeNull();
    expect(resolvePlaysLegacyRedirect({ tab: "playbooks" })).toBeNull();
    expect(resolvePlaysLegacyRedirect({ tab: "queue", filter: "auto_handled" })).toBeNull();
    expect(resolvePlaysLegacyRedirect({ tab: "activity" })).toBeNull();
  });
});
