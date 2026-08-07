import { describe, expect, it } from "vitest";
import {
  connectorHealthImpactCopy,
  shouldShowConnectorHealth,
} from "./connector-health";

describe("shouldShowConnectorHealth", () => {
  it("hides the card when there are no reconnect items", () => {
    expect(shouldShowConnectorHealth(0)).toBe(false);
  });

  it("shows the card when at least one connector needs reconnect", () => {
    expect(shouldShowConnectorHealth(1)).toBe(true);
    expect(shouldShowConnectorHealth(3)).toBe(true);
  });
});

describe("connectorHealthImpactCopy", () => {
  it("uses singular copy for one connector", () => {
    expect(connectorHealthImpactCopy(1)).toBe(
      "This connection expired. Reconnect so Salt can keep learning.",
    );
  });

  it("uses plural copy for multiple connectors", () => {
    expect(connectorHealthImpactCopy(2)).toBe(
      "These connections expired. Reconnect so Salt can keep learning.",
    );
  });
});
