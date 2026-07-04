import { describe, expect, it } from "vitest";
import {
  EMPTY_MEMORY_ADDRESS,
  formatAddressSummary,
  legalAddressFromRow,
  memoryAddressFromRow,
} from "./address-fields";

describe("address-fields", () => {
  it("formats a structured address summary", () => {
    expect(
      formatAddressSummary({
        ...EMPTY_MEMORY_ADDRESS,
        addressLine1: "123 Main St",
        city: "Portland",
        state: "OR",
        postalCode: "97201",
        country: "US",
      }),
    ).toBe("123 Main St · Portland, OR · 97201 · US");
  });

  it("maps profile rows to memory address fields", () => {
    expect(
      memoryAddressFromRow({
        address_line_1: "123 Main St",
        city: "Portland",
      }),
    ).toEqual({
      addressLine1: "123 Main St",
      addressLine2: "",
      city: "Portland",
      state: "",
      postalCode: "",
      country: "",
    });
  });

  it("falls back to legacy legal_address text", () => {
    expect(
      legalAddressFromRow({
        legal_address: "123 Main St, City, ST 12345",
      }),
    ).toEqual({
      ...EMPTY_MEMORY_ADDRESS,
      addressLine1: "123 Main St, City, ST 12345",
    });
  });
});
