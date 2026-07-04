import { describe, expect, it } from "vitest";
import { normalizeHealthFactors } from "./display";
import type { HealthFactor } from "./core";

describe("normalizeHealthFactors", () => {
  it("sorts risk factors before watch and good", () => {
    const factors: HealthFactor[] = [
      {
        key: "good",
        label: "Invoices clear",
        subScore: 100,
        weight: 1,
        direction: "positive",
        detail: "Nothing overdue",
      },
      {
        key: "risk",
        label: "Recent contact",
        subScore: 20,
        weight: 1,
        direction: "negative",
        detail: "No contact recorded",
      },
      {
        key: "watch",
        label: "Open balance",
        subScore: 55,
        weight: 1,
        direction: "neutral",
        detail: "$500 outstanding",
      },
    ];

    const normalized = normalizeHealthFactors(factors);
    expect(normalized.map((factor) => factor.label)).toEqual([
      "Recent contact",
      "Open balance",
      "Invoices clear",
    ]);
  });

  it("returns fallback when no factors are present", () => {
    const normalized = normalizeHealthFactors([], {
      label: "Account health",
      detail: "Scored from account signals",
      tone: "watch",
    });

    expect(normalized).toEqual([
      {
        label: "Account health",
        detail: "Scored from account signals",
        tone: "watch",
      },
    ]);
  });

  it("preserves human-readable detail text from scoring engine", () => {
    const factors: HealthFactor[] = [
      {
        key: "contact_recency",
        label: "Recent contact",
        subScore: 80,
        weight: 0.25,
        direction: "positive",
        detail: "2 days since last touch",
      },
      {
        key: "overdue_invoices",
        label: "Invoice status",
        subScore: 100,
        weight: 0.15,
        direction: "positive",
        detail: "No overdue invoices",
      },
    ];

    const normalized = normalizeHealthFactors(factors);
    expect(normalized[0]?.detail).toBe("2 days since last touch");
    expect(normalized[1]?.detail).toBe("No overdue invoices");
  });
});
