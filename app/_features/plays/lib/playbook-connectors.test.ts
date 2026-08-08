import { describe, expect, it } from "vitest";
import { getPlaybookConnectorIds } from "./playbook-connectors";

describe("getPlaybookConnectorIds", () => {
  it("maps required categories to representative connector logos", () => {
    expect(getPlaybookConnectorIds({ required: ["email"] })).toEqual([
      "google",
      "outlook",
    ]);
  });

  it("appends optional categories after required", () => {
    expect(
      getPlaybookConnectorIds({ required: ["billing"], optional: ["email"] })
    ).toEqual(["stripe", "quickbooks", "google"]);
  });

  it("caps the cluster at 3 logos", () => {
    expect(
      getPlaybookConnectorIds({
        required: ["calendar"],
        optional: ["meetings"],
      })
    ).toEqual(["google-calendar", "calendly", "zoom"]);
  });

  it("dedupes ids across categories", () => {
    const ids = getPlaybookConnectorIds({
      required: ["documents", "storage"],
      optional: ["documents"],
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns an empty array when no categories are declared", () => {
    expect(getPlaybookConnectorIds({})).toEqual([]);
  });
});
