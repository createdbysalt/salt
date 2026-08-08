import { describe, it, expect } from "vitest";

import { getSourceMeta } from "./source-taxonomy";

describe("getSourceMeta", () => {
  it("returns Cal.com metadata for the canonical calcom key", () => {
    const meta = getSourceMeta("calcom");

    expect(meta).toBeDefined();
    expect(meta.category).toBe("calendar");
  });

  it("aliases the Composio provider key 'cal' to calcom", () => {
    // 'cal' is the Composio toolkit/provider key; capture rows and the
    // taxonomy use 'calcom'. Runtime lookups with the provider key must not
    // come back undefined (they used to, breaking source metadata).
    const viaAlias = getSourceMeta("cal");

    expect(viaAlias).toBeDefined();
    expect(viaAlias).toBe(getSourceMeta("calcom"));
  });
});
