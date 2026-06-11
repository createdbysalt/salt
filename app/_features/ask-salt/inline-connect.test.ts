import { describe, expect, it } from "vitest";
import {
  connectorPayloadToInline,
  extractConnectorTurnFromMetadata,
} from "./inline-connect";

describe("connectorPayloadToInline", () => {
  it("marks composio connectors as connectable when disconnected", () => {
    const inline = connectorPayloadToInline({
      connectorId: "google",
      name: "Google",
      description: "Gmail and Calendar",
      connected: false,
      ownership: "composio",
    });

    expect(inline.canConnect).toBe(true);
    expect(inline.canDisconnect).toBe(false);
  });

  it("marks connected composio connectors as disconnectable", () => {
    const inline = connectorPayloadToInline({
      connectorId: "google",
      name: "Google",
      description: "Gmail and Calendar",
      connected: true,
      ownership: "composio",
      statusLabel: "you@gmail.com",
    });

    expect(inline.canConnect).toBe(false);
    expect(inline.canDisconnect).toBe(true);
  });
});

describe("extractConnectorTurnFromMetadata", () => {
  it("reads inline metadata shape", () => {
    const turn = extractConnectorTurnFromMetadata({
      kind: "connector",
      inlineAction: {
        connectorId: "google",
        name: "Google",
        connected: false,
        comingSoon: false,
        ownership: "composio",
        canConnect: true,
        canDisconnect: false,
      },
      showBrowseConnectors: true,
      suggestions: ["Connect Google"],
    });

    expect(turn?.inlineAction?.connectorId).toBe("google");
    expect(turn?.showBrowseConnectors).toBe(true);
    expect(turn?.suggestions).toEqual(["Connect Google"]);
  });

  it("falls back to legacy connectors array", () => {
    const turn = extractConnectorTurnFromMetadata({
      kind: "connector",
      connectors: [
        {
          connectorId: "google",
          name: "Google",
          description: "Gmail",
          connected: false,
          ownership: "composio",
        },
      ],
    });

    expect(turn?.inlineAction?.canConnect).toBe(true);
    expect(turn?.showBrowseConnectors).toBe(false);
  });
});
