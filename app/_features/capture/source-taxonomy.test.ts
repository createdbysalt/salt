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

  it("falls back to generic meta for registry providers without curated taxonomy (plan 5.3)", () => {
    // source_type is TEXT — any connector-registry provider can land on a
    // capture row. Unknown keys must render humanely, never undefined.
    const meta = getSourceMeta("yahoo_mail");

    expect(meta).toBeDefined();
    expect(meta.label).toBe("Yahoo Mail");
    expect(meta.category).toBe("other");
    expect(meta.icon).toBeDefined();
  });

  it("generic fallback humanizes single-word and dashed keys", () => {
    expect(getSourceMeta("protonmail").label).toBe("Protonmail");
    expect(getSourceMeta("fast-mail").label).toBe("Fast Mail");
  });
});
