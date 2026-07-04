import { describe, expect, it } from "vitest";
import { getEntityReadiness } from "./readiness";

describe("getEntityReadiness", () => {
  it("marks a person invoice-ready when billing identity and address are present", () => {
    const readiness = getEntityReadiness("person", {
      name: "Avery Stone",
      email: "avery@example.com",
      billingEmail: "billing@example.com",
      timezone: "America/New_York",
      addressLine1: "123 Main St",
      city: "Toronto",
      postalCode: "M5V 1A1",
      country: "CA",
    });

    expect(readiness.find((item) => item.capability.id === "invoicing")?.ready).toBe(true);
    expect(readiness.find((item) => item.capability.id === "scheduling")?.ready).toBe(true);
  });

  it("returns missing fields for sparse work invoicing context", () => {
    const readiness = getEntityReadiness("work", {
      title: "Brand refresh",
      currency: "USD",
    });

    const invoice = readiness.find((item) => item.capability.id === "invoicing");
    expect(invoice?.ready).toBe(false);
    expect(invoice?.missingFields).toEqual(["billingContactId", "paymentTerms", "contractValueOrScope"]);
  });

  it("treats final price as contract value for work readiness", () => {
    const readiness = getEntityReadiness("work", {
      billingContactId: "person-1",
      paymentTerms: "net_30",
      currency: "USD",
      finalPriceCents: 640000,
    });

    expect(readiness.find((item) => item.capability.id === "invoicing")?.ready).toBe(true);
  });
});
