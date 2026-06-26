import { describe, it, expect } from "vitest";
import { orgDisplayToStatus, orgStatusToDisplay } from "./relationship-display";

describe("org relationship display", () => {
  it("maps db status to UI label", () => {
    expect(orgStatusToDisplay("client")).toBe("Client");
    expect(orgStatusToDisplay("past_client")).toBe("Past client");
  });

  it("maps UI label back to db status", () => {
    expect(orgDisplayToStatus("Client")).toBe("client");
    expect(orgDisplayToStatus("Past client")).toBe("past_client");
  });
});
