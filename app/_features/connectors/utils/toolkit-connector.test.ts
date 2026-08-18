import { describe, expect, it } from "vitest";
import { connectorForToolkit, connectorsForToolkits } from "./toolkit-connector";

describe("connectorForToolkit", () => {
  it("maps composio toolkit slugs to connector catalog ids", () => {
    expect(connectorForToolkit("gmail")).toEqual({ id: "google", label: "Gmail" });
    expect(connectorForToolkit("googlecalendar")).toEqual({
      id: "google-calendar",
      label: "Google Calendar",
    });
    expect(connectorForToolkit("slack")).toEqual({ id: "slack", label: "Slack" });
    // Cal.com's Composio toolkit slug ("cal") differs from the catalog id.
    expect(connectorForToolkit("cal")).toEqual({ id: "calcom", label: "Cal.com" });
  });

  it("falls back to the toolkit slug when it matches a catalog id", () => {
    expect(connectorForToolkit("notion")).toEqual({ id: "notion", label: "Notion" });
  });
});

describe("connectorsForToolkits", () => {
  it("deduplicates connectors by catalog id", () => {
    expect(connectorsForToolkits(["gmail", "google", "GMAIL"])).toEqual([
      { id: "google", label: "Gmail" },
    ]);
  });
});
