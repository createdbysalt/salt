import { describe, expect, it } from "vitest";

import { isPlaceholderWorkName } from "./work-name";

describe("isPlaceholderWorkName", () => {
  it("recognizes counterparty-anchored placeholders", () => {
    expect(isPlaceholderWorkName("Kainos Labs — Project")).toBe(true);
    expect(isPlaceholderWorkName("Sam Example — Project")).toBe(true);
    expect(isPlaceholderWorkName("Acme — project")).toBe(true);
  });

  it("rejects real project names and empty input", () => {
    expect(isPlaceholderWorkName("Playground Website")).toBe(false);
    expect(isPlaceholderWorkName("Project Phoenix")).toBe(false);
    expect(isPlaceholderWorkName("Kainos Labs — Brand Refresh")).toBe(false);
    expect(isPlaceholderWorkName("")).toBe(false);
    expect(isPlaceholderWorkName(null)).toBe(false);
    expect(isPlaceholderWorkName(undefined)).toBe(false);
  });
});
