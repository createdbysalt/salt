import { describe, expect, it } from "vitest";
import { derivePlaybookPatterns } from "./patterns";
import type { PlaybookAdjustment } from "./queries";

function edit(
  previousLength: number,
  newLength: number,
  id = crypto.randomUUID()
): PlaybookAdjustment {
  return {
    id,
    action: "edited",
    title: "Draft",
    createdAt: new Date().toISOString(),
    previousLength,
    newLength,
  };
}

function dismissal(id = crypto.randomUUID()): PlaybookAdjustment {
  return {
    id,
    action: "dismissed",
    title: "Draft",
    createdAt: new Date().toISOString(),
  };
}

describe("derivePlaybookPatterns", () => {
  it("returns no patterns when there are no adjustments", () => {
    expect(derivePlaybookPatterns([])).toEqual([]);
  });

  it("ignores edits without length metadata", () => {
    const adjustments: PlaybookAdjustment[] = [
      { id: "1", action: "edited", title: "Draft", createdAt: new Date().toISOString() },
      { id: "2", action: "edited", title: "Draft", createdAt: new Date().toISOString() },
    ];
    expect(derivePlaybookPatterns(adjustments)).toEqual([]);
  });

  it("flags 'shorter drafts' as emerging after two shortening edits", () => {
    const patterns = derivePlaybookPatterns([
      edit(500, 300),
      edit(400, 200),
    ]);
    expect(patterns).toEqual([
      { key: "shorter-drafts", label: "You prefer shorter drafts", emerging: true },
    ]);
  });

  it("confirms the pattern once the same correction repeats", () => {
    const patterns = derivePlaybookPatterns([
      edit(500, 300),
      edit(400, 200),
      edit(600, 350),
      edit(450, 250),
    ]);
    expect(patterns).toEqual([
      { key: "shorter-drafts", label: "You prefer shorter drafts", emerging: false },
    ]);
  });

  it("flags 'more detail' when edits consistently lengthen drafts", () => {
    const patterns = derivePlaybookPatterns([edit(200, 500), edit(300, 600)]);
    expect(patterns).toEqual([
      {
        key: "longer-drafts",
        label: "You add more detail to drafts",
        emerging: true,
      },
    ]);
  });

  it("surfaces repeated dismissals as a confirmed misfire pattern", () => {
    const patterns = derivePlaybookPatterns([
      dismissal(),
      dismissal(),
      dismissal(),
      dismissal(),
    ]);
    expect(patterns).toEqual([
      {
        key: "often-dismissed",
        label: "This play's drafts often miss the mark",
        emerging: false,
      },
    ]);
  });

  it("does not flag dismissals below the confirmed threshold", () => {
    expect(derivePlaybookPatterns([dismissal(), dismissal()])).toEqual([]);
  });
});
