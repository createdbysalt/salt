import { describe, it, expect } from "vitest";
import { extractWithManifest, getQueryFromManifest } from "./config-driven-extractor";
import { stripeManifest } from "./connectors/stripe";
import { hubspotManifest } from "./connectors/hubspot";

describe("extractWithManifest", () => {
  const mockStripeResponse = {
    data: [
      {
        id: "cus_123",
        email: "john@example.com",
        name: "  John Doe  ",
        phone: "+1 (555) 123-4567",
        address: {
          line1: "123 Main St",
          line2: "Apt 4",
          city: "San Francisco",
          state: "CA",
          postal_code: "94102",
          country: "us",
        },
        metadata: {
          company: "Acme Corp",
        },
        description: "VIP customer",
      },
    ],
  };

  it("extracts person fields from Stripe response", () => {
    const result = extractWithManifest(stripeManifest, "person", mockStripeResponse, {
      email: "john@example.com",
    });

    expect(result.hasData).toBe(true);
    expect(result.fields.email?.value).toBe("john@example.com");
    expect(result.fields.name?.value).toBe("John Doe");
    expect(result.fields.phone?.value).toBe("+15551234567");
    expect(result.fields.city?.value).toBe("San Francisco");
    expect(result.fields.country?.value).toBe("US");
  });

  it("applies confidence scores correctly", () => {
    const result = extractWithManifest(stripeManifest, "person", mockStripeResponse, {
      email: "john@example.com",
    });

    expect(result.fields.email?.confidence).toBe(0.99);
    expect(result.fields.name?.confidence).toBe(0.99);
  });

  it("extracts connection candidates", () => {
    const result = extractWithManifest(stripeManifest, "person", mockStripeResponse, {
      email: "john@example.com",
    });

    expect(result.connections?.orgs).toHaveLength(1);
    expect(result.connections?.orgs?.[0].name).toBe("Acme Corp");
  });

  it("extracts notes", () => {
    const result = extractWithManifest(stripeManifest, "person", mockStripeResponse, {
      email: "john@example.com",
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes?.[0].content).toBe("Stripe customer note: VIP customer");
  });

  it("returns empty result when no entity config", () => {
    const result = extractWithManifest(stripeManifest, "me", mockStripeResponse, {
      email: "john@example.com",
    });

    expect(result.hasData).toBe(false);
    expect(Object.keys(result.fields)).toHaveLength(0);
  });

  it("returns empty result when response is empty", () => {
    const result = extractWithManifest(stripeManifest, "person", { data: [] }, {
      email: "john@example.com",
    });

    expect(result.hasData).toBe(false);
  });

  it("tracks unmapped fields", () => {
    const result = extractWithManifest(stripeManifest, "person", mockStripeResponse, {
      email: "john@example.com",
    });

    expect(result.unmappedFields).toBeDefined();
    expect(result.unmappedFields).toContain("linkedin_url");
    expect(result.unmappedFields).toContain("twitter_handle");
  });
});

describe("getQueryFromManifest", () => {
  it("builds query from seed", () => {
    const result = getQueryFromManifest(stripeManifest, "person", {
      email: "john@example.com",
    });

    expect(result).not.toBeNull();
    expect(result?.action).toBe("STRIPE_SEARCH_CUSTOMERS");
    expect(result?.query).toBe("email:'john@example.com'");
  });

  it("uses fallback when primary template has missing values", () => {
    const result = getQueryFromManifest(stripeManifest, "person", {
      name: "John Doe",
    });

    expect(result?.query).toBe("name:'John Doe'");
  });

  it("splits full name into first and last for HubSpot fallback", () => {
    const result = getQueryFromManifest(hubspotManifest, "person", {
      name: "Jane Example",
    });

    expect(result?.query).toBe("firstname:Jane lastname:Example");
  });

  it("returns null when no entity config", () => {
    const result = getQueryFromManifest(stripeManifest, "me", {
      email: "john@example.com",
    });

    expect(result).toBeNull();
  });
});
