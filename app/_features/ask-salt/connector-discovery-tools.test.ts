import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sanitizeCatalogQuery } from "./connector-discovery-tools";

describe("sanitizeCatalogQuery", () => {
  it("passes ordinary search terms through", () => {
    expect(sanitizeCatalogQuery("create a page")).toBe("create a page");
    expect(sanitizeCatalogQuery("cal-com bookings")).toBe("cal-com bookings");
  });

  it("strips PostgREST filter metacharacters (injection defense)", () => {
    // Attempted filter injection: close the ilike and add extra conditions.
    expect(
      sanitizeCatalogQuery("x%,tool_slug.eq.GMAIL_SEND_EMAIL,name.ilike.%"),
    ).toBe("x tool slug eq GMAIL SEND EMAIL name ilike");
    expect(sanitizeCatalogQuery("a(b)c.d,e")).toBe("a b c d e");
  });

  it("strips ilike wildcards and collapses whitespace", () => {
    expect(sanitizeCatalogQuery("%_%  send   email _")).toBe("send email");
  });

  it("returns empty for queries made only of metacharacters", () => {
    expect(sanitizeCatalogQuery("%,()._")).toBe("");
  });
});
