import { describe, expect, it } from "vitest";
import {
  CONNECTOR_CONTENT_CONTRACT,
  REQUIRED_CONTENT_KEYS,
  deriveConnectorOverview,
} from "./content-contract";
import type { ConnectorCapabilityGroups } from "./connector-capabilities";

function groups(read: number, write: number): ConnectorCapabilityGroups {
  const cap = (i: number) => ({
    id: `t${i}`,
    label: `Tool ${i}`,
    risk: "read" as const,
    toolSlug: `T_${i}`,
  });
  return {
    read: Array.from({ length: read }, (_, i) => cap(i)),
    write: Array.from({ length: write }, (_, i) => ({ ...cap(i), risk: "write" as const })),
    overviewBullets: [],
  };
}

describe("connector content contract", () => {
  it("declares the required page fields", () => {
    expect(REQUIRED_CONTENT_KEYS).toContain("overview");
    expect(REQUIRED_CONTENT_KEYS).toContain("tools");
    expect(REQUIRED_CONTENT_KEYS).toContain("tagline");
    // Curated-optional fields are NOT required (absent is honest).
    expect(REQUIRED_CONTENT_KEYS).not.toContain("developer");
    expect(REQUIRED_CONTENT_KEYS).not.toContain("links");
  });

  it("every contract field has a source and note", () => {
    for (const field of CONNECTOR_CONTENT_CONTRACT) {
      expect(field.source).toMatch(/^(synced|derived|curated)$/);
      expect(field.note.length).toBeGreaterThan(0);
    }
  });
});

describe("deriveConnectorOverview", () => {
  it("produces a truthful, non-empty overview for a read+write connector", () => {
    const bullets = deriveConnectorOverview({
      name: "QuickBooks",
      groups: groups(5, 2),
      captureCapable: false,
    });
    expect(bullets.length).toBeGreaterThanOrEqual(3);
    expect(bullets.some((b) => b.includes("reads your QuickBooks"))).toBe(true);
    expect(bullets.some((b) => b.includes("approve each one"))).toBe(true);
    expect(bullets.some((b) => b.includes("never delete"))).toBe(true);
  });

  it("adds a capture line only when capture-capable", () => {
    const withCapture = deriveConnectorOverview({
      name: "Gmail",
      groups: groups(3, 1),
      captureCapable: true,
    });
    expect(withCapture.some((b) => b.includes("Memory capture"))).toBe(true);

    const without = deriveConnectorOverview({
      name: "QuickBooks",
      groups: groups(3, 1),
      captureCapable: false,
    });
    expect(without.some((b) => b.includes("Memory capture"))).toBe(false);
  });

  it("still states the delete guarantee for a read-only connector", () => {
    const bullets = deriveConnectorOverview({
      name: "PageSpeed",
      groups: groups(2, 0),
      captureCapable: false,
    });
    expect(bullets.some((b) => b.includes("never delete"))).toBe(true);
    expect(bullets.some((b) => b.includes("approve each one"))).toBe(false);
  });
});
