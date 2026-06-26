import { describe, expect, it } from "vitest";
import {
  classifyAskSaltIntent,
  isConnectorIntent,
  resolveConnectorTarget,
} from "./router";

describe("classifyAskSaltIntent", () => {
  it("classifies connect catalog starter", () => {
    expect(classifyAskSaltIntent("Connect a tool")).toBe("connect_catalog");
    expect(classifyAskSaltIntent("What can I connect?")).toBe("connect_catalog");
  });

  it("classifies connection status", () => {
    expect(classifyAskSaltIntent("What's connected?")).toBe("connector_status");
    expect(classifyAskSaltIntent("Show my integrations")).toBe("connector_status");
  });

  it("classifies disconnect", () => {
    expect(classifyAskSaltIntent("Disconnect Gmail")).toBe("connector_disconnect");
    expect(classifyAskSaltIntent("Remove my Google connection")).toBe(
      "connector_disconnect",
    );
  });

  it("classifies connect", () => {
    expect(classifyAskSaltIntent("Connect Google")).toBe("connect");
    expect(classifyAskSaltIntent("Set up Gmail")).toBe("connect");
  });

  it("routes tool operations to chat", () => {
    expect(classifyAskSaltIntent("List my recent emails")).toBe("tool_chat");
    expect(classifyAskSaltIntent("Run a Play")).toBe("tool_chat");
  });

  it("routes Files Memory link saves to chat instead of connector connect", () => {
    expect(
      classifyAskSaltIntent("Save this link to the right person in Files Memory"),
    ).toBe("tool_chat");
    expect(
      classifyAskSaltIntent("Save this file or link to the right person, org, or work item."),
    ).toBe("tool_chat");
    expect(classifyAskSaltIntent("Add https://figma.com/file/abc to files")).toBe("tool_chat");
  });

  it("still routes integration link phrasing to connect", () => {
    expect(classifyAskSaltIntent("Link my Google account")).toBe("connect");
    expect(classifyAskSaltIntent("Connect and link Gmail")).toBe("connect");
  });
});

describe("resolveConnectorTarget", () => {
  it("resolves gmail mentions to the Gmail connector", () => {
    expect(resolveConnectorTarget("Connect Google")).toBe("google");
    expect(resolveConnectorTarget("Connect Gmail")).toBe("google");
  });

  it("resolves calendar mentions to the Google Calendar connector", () => {
    expect(resolveConnectorTarget("Connect Google Calendar")).toBe("google-calendar");
    expect(resolveConnectorTarget("Connect my calendar")).toBe("google-calendar");
    expect(resolveConnectorTarget("Connect Gmail and calendar")).toBe("google");
  });

  it("resolves stripe", () => {
    expect(resolveConnectorTarget("Connect Stripe payments")).toBe("stripe");
  });

  it("returns unknown when unspecified", () => {
    expect(resolveConnectorTarget("Connect a tool")).toBe("unknown");
  });
});

describe("isConnectorIntent", () => {
  it("returns true for connector intents only", () => {
    expect(isConnectorIntent("connect")).toBe(true);
    expect(isConnectorIntent("connector_status")).toBe(true);
    expect(isConnectorIntent("tool_chat")).toBe(false);
  });
});
