import { describe, expect, it } from "vitest";
import {
  buildToolEmptyMessage,
  buildToolPermissionsSummary,
  buildToolSearchSummary,
  shouldShowToolSection,
} from "./tool-risk-filter";

describe("buildToolPermissionsSummary", () => {
  it("shows the full breakdown when no filters are active", () => {
    expect(
      buildToolPermissionsSummary({
        toolRiskFilter: "all",
        toolQuery: "",
        readCount: 72,
        writeCount: 37,
        filteredReadCount: 72,
        filteredWriteCount: 37,
      }),
    ).toBe("109 tools · 72 read · 37 write");
  });

  it("narrows the summary when only read tools are shown", () => {
    expect(
      buildToolPermissionsSummary({
        toolRiskFilter: "read",
        toolQuery: "",
        readCount: 72,
        writeCount: 37,
        filteredReadCount: 72,
        filteredWriteCount: 0,
      }),
    ).toBe("72 read-only tools");
  });

  it("reflects search matches within the active risk filter", () => {
    expect(
      buildToolPermissionsSummary({
        toolRiskFilter: "write",
        toolQuery: "invoice",
        readCount: 72,
        writeCount: 37,
        filteredReadCount: 0,
        filteredWriteCount: 4,
      }),
    ).toBe("4 of 37 write / delete tools");
  });
});

describe("buildToolSearchSummary", () => {
  it("returns null when search is empty", () => {
    expect(
      buildToolSearchSummary({
        toolRiskFilter: "all",
        toolQuery: "",
        readCount: 72,
        writeCount: 37,
        filteredReadCount: 72,
        filteredWriteCount: 37,
      }),
    ).toBeNull();
  });

  it("describes narrowed search results", () => {
    expect(
      buildToolSearchSummary({
        toolRiskFilter: "write",
        toolQuery: "invoice",
        readCount: 72,
        writeCount: 37,
        filteredReadCount: 0,
        filteredWriteCount: 4,
      }),
    ).toBe("4 of 37 write / delete tools");
  });
});

describe("buildToolEmptyMessage", () => {
  it("describes empty search results within a risk filter", () => {
    expect(buildToolEmptyMessage("write", "invoice")).toBe(
      "No write / delete tools match your search.",
    );
  });
});

describe("shouldShowToolSection", () => {
  it("hides write tools when the read filter is active", () => {
    expect(shouldShowToolSection("read", "write", 12)).toBe(false);
    expect(shouldShowToolSection("read", "read", 12)).toBe(true);
  });
});
