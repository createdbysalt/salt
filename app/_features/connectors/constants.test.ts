import { describe, expect, it } from "vitest";
import { connectorsPageUrl, reconnectNeededHref } from "./constants";

describe("connectorsPageUrl", () => {
  it("points at the Sources surface", () => {
    expect(connectorsPageUrl()).toBe("/sources");
    expect(connectorsPageUrl({ connector: "notion" })).toBe("/sources?connector=notion");
  });
});

describe("reconnectNeededHref", () => {
  it("deep-links a single expired connector", () => {
    expect(reconnectNeededHref([{ catalogId: "notion" }])).toBe(
      connectorsPageUrl({ connector: "notion" }),
    );
  });

  it("opens the connectors list when multiple connectors need reconnect", () => {
    expect(
      reconnectNeededHref([{ catalogId: "notion" }, { catalogId: "gmail" }]),
    ).toBe(connectorsPageUrl());
  });

  it("opens the connectors list when the list is empty", () => {
    expect(reconnectNeededHref([])).toBe(connectorsPageUrl());
  });
});
