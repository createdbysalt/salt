import { describe, expect, it } from "vitest";
import {
  formatServicesForContext,
  type ServiceContextRow,
} from "./assembleOperatorContext";

function service(overrides: Partial<ServiceContextRow>): ServiceContextRow {
  return {
    id: "svc-1",
    name: "Brand Identity",
    description: "Full identity system. Includes logo, palette, and guidelines.",
    value_proposition: null,
    base_price_cents: null,
    typical_timeline: null,
    is_bundle: false,
    ai_sales_context: null,
    pricing_intelligence: null,
    ...overrides,
  };
}

describe("formatServicesForContext", () => {
  it("renders name with price, floor, and timeline meta", () => {
    const lines = formatServicesForContext([
      service({
        base_price_cents: 450000,
        typical_timeline: "3 weeks",
        pricing_intelligence: { floorPriceCents: 300000 },
      }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Brand Identity ($4,500, floor $3,000, 3 weeks)");
  });

  it("prefers the value proposition over the description, first sentence only", () => {
    const lines = formatServicesForContext([
      service({
        value_proposition: "Positions you as the obvious choice. Long tail here.",
      }),
    ]);
    expect(lines[0]).toContain("Positions you as the obvious choice.");
    expect(lines[0]).not.toContain("Long tail here");
  });

  it("includes up to two buying signals and follow-on service names", () => {
    const lines = formatServicesForContext(
      [
        service({
          ai_sales_context: {
            idealTiming: { buyingSignals: ["rebrand mention", "new funding", "third signal"] },
          },
        }),
        service({ id: "svc-2", name: "Web Design" }),
      ],
      new Map([["svc-1", ["Web Design"]]]),
    );
    expect(lines[0]).toContain("Buying signals: rebrand mention; new funding");
    expect(lines[0]).not.toContain("third signal");
    expect(lines[0]).toContain("Often leads to: Web Design");
  });

  it("tolerates malformed JSONB intelligence payloads", () => {
    const lines = formatServicesForContext([
      service({ ai_sales_context: "not-an-object", pricing_intelligence: 42 }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Brand Identity");
  });

  it("skips unnamed services and truncates whole services at the char budget", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      service({
        id: `svc-${i}`,
        name: `Service ${i}`,
        value_proposition: "v".repeat(80),
      }),
    );
    const lines = formatServicesForContext([service({ name: null }), ...many]);
    const total = lines.join("\n").length;
    expect(total).toBeLessThanOrEqual(1500);
    expect(lines.length).toBeLessThan(40);
    expect(lines.every((l) => l.startsWith("- Service"))).toBe(true);
  });
});
