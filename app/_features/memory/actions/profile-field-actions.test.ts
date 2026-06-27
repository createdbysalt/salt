import { describe, it, expect } from "vitest";
import {
  computeRevertValue,
  type ProfileFieldHistoryRow,
} from "./profile-field-actions";

describe("computeRevertValue", () => {
  it("returns prior value when history has two applied entries", async () => {
    const history: ProfileFieldHistoryRow[] = [
      { value: { text: "current" }, set_at: "2026-06-26T12:00:00Z" },
      { value: { text: "previous" }, set_at: "2026-06-25T12:00:00Z" },
    ];

    expect(await computeRevertValue(history, "relationship_type")).toBe("previous");
    expect(await computeRevertValue(history, "title")).toBe("previous");
  });

  it("falls back to 'unknown' for relationship_type when no prior value", async () => {
    const history: ProfileFieldHistoryRow[] = [
      { value: { text: "client" }, set_at: "2026-06-26T12:00:00Z" },
    ];

    expect(await computeRevertValue(history, "relationship_type")).toBe("unknown");
  });

  it("falls back to empty string for text fields when no prior value", async () => {
    const history: ProfileFieldHistoryRow[] = [
      { value: { text: "CEO" }, set_at: "2026-06-26T12:00:00Z" },
    ];

    expect(await computeRevertValue(history, "title")).toBe("");
    expect(await computeRevertValue(history, "org_link")).toBe("");
    expect(await computeRevertValue(history, "website")).toBe("");
    expect(await computeRevertValue(history, "industry")).toBe("");
  });

  it("handles empty history array", async () => {
    expect(await computeRevertValue([], "relationship_type")).toBe("unknown");
    expect(await computeRevertValue([], "title")).toBe("");
  });

  it("handles null/undefined history", async () => {
    expect(await computeRevertValue(null, "relationship_type")).toBe("unknown");
    expect(await computeRevertValue(undefined, "title")).toBe("");
  });

  it("handles null value object in history row", async () => {
    const history: ProfileFieldHistoryRow[] = [
      { value: { text: "current" }, set_at: "2026-06-26T12:00:00Z" },
      { value: null, set_at: "2026-06-25T12:00:00Z" },
    ];

    expect(await computeRevertValue(history, "relationship_type")).toBe("unknown");
    expect(await computeRevertValue(history, "title")).toBe("");
  });

  it("handles missing text property in value object", async () => {
    const history: ProfileFieldHistoryRow[] = [
      { value: { text: "current" }, set_at: "2026-06-26T12:00:00Z" },
      { value: {}, set_at: "2026-06-25T12:00:00Z" },
    ];

    expect(await computeRevertValue(history, "relationship_type")).toBe("unknown");
  });
});
