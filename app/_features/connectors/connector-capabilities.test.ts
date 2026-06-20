import { describe, expect, it } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import {
  getComposioProviderForToolSlug,
  getConnectorCapabilities,
  supportsToolPreferences,
} from "./connector-capabilities";
import {
  getDisabledToolsFromConfig,
  mergeDisabledToolsIntoConfig,
  parseConnectorIntegrationConfig,
} from "./connector-config";

describe("connector capabilities", () => {
  it("returns only Gmail tools for the Gmail connector (per-app split)", () => {
    const groups = getConnectorCapabilities("google");
    expect(groups).not.toBeNull();
    expect(groups?.write.some((cap) => cap.toolSlug === COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL)).toBe(
      true,
    );
    expect(
      groups?.write.some(
        (cap) => cap.toolSlug === COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
      ),
    ).toBe(false);
    expect(groups?.read.length).toBeGreaterThan(0);
  });

  it("returns only Calendar tools for the Calendar connector, never delete", () => {
    const groups = getConnectorCapabilities("google-calendar");
    expect(groups).not.toBeNull();
    expect(
      groups?.write.some(
        (cap) => cap.toolSlug === COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
      ),
    ).toBe(true);
    expect(
      groups?.write.some((cap) => cap.toolSlug === COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL),
    ).toBe(false);
    // Destructive class: delete-event is never offered as a capability.
    expect(
      [...(groups?.read ?? []), ...(groups?.write ?? [])].some(
        (cap) => cap.toolSlug === COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT,
      ),
    ).toBe(false);
  });

  it("returns Composio-backed Stripe capabilities", () => {
    const groups = getConnectorCapabilities("stripe");
    expect(groups?.read.length).toBeGreaterThan(0);
    expect(groups?.write.length).toBeGreaterThan(0);
    expect(
      [...(groups?.read ?? []), ...(groups?.write ?? [])].every(
        (cap) => cap.toolSlug?.startsWith("STRIPE_"),
      ),
    ).toBe(true);
    // Destructive class: delete-customer is never offered as a capability.
    expect(
      [...(groups?.read ?? []), ...(groups?.write ?? [])].some(
        (cap) => cap.toolSlug === COMPOSIO_TOOL_SLUGS.STRIPE_DELETE_CUSTOMER,
      ),
    ).toBe(false);
    expect(groups?.overviewBullets.length).toBeGreaterThan(0);
  });

  it("returns null for unknown catalog ids", () => {
    expect(
      getConnectorCapabilities("not-a-connector" as "google"),
    ).toBeNull();
  });

  it("maps tool slugs to composio providers", () => {
    expect(getComposioProviderForToolSlug(COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL)).toBe(
      "gmail",
    );
    expect(
      getComposioProviderForToolSlug(COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT),
    ).toBe("googlecalendar");
  });

  it("flags tool-preference connectors", () => {
    expect(supportsToolPreferences("google")).toBe(true);
    expect(supportsToolPreferences("stripe")).toBe(true);
  });

  it("maps Stripe tool slugs to the stripe provider", () => {
    expect(
      getComposioProviderForToolSlug(COMPOSIO_TOOL_SLUGS.STRIPE_LIST_INVOICES),
    ).toBe("stripe");
  });
});

describe("connector integration config", () => {
  it("defaults missing disabledTools to empty", () => {
    expect(getDisabledToolsFromConfig({ email: "a@b.com" })).toEqual([]);
  });

  it("merges disabledTools without clobbering legacy keys", () => {
    const merged = mergeDisabledToolsIntoConfig(
      { email: "hello@usesalt.io", username: "salt" },
      [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL],
    );
    expect(merged).toEqual({
      email: "hello@usesalt.io",
      username: "salt",
      disabledTools: [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL],
    });
  });

  it("parses config with passthrough fields", () => {
    const parsed = parseConnectorIntegrationConfig({
      botEmail: "fred@fireflies.ai",
      disabledTools: ["CAL_CREATE_BOOKING"],
    });
    expect(parsed.disabledTools).toEqual(["CAL_CREATE_BOOKING"]);
    expect(parsed.botEmail).toBe("fred@fireflies.ai");
  });
});
