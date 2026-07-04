export type MemoryAddressField =
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "country";

export type MemoryAddressFields = Record<MemoryAddressField, string>;

export const EMPTY_MEMORY_ADDRESS: MemoryAddressFields = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

export function formatAddressSummary(
  address: MemoryAddressFields,
): string | null {
  const parts: string[] = [];

  if (address.addressLine1) {
    parts.push(address.addressLine1);
  }

  const cityState = [address.city, address.state].filter(Boolean).join(", ");
  if (cityState) {
    parts.push(cityState);
  }

  if (address.postalCode) {
    parts.push(address.postalCode);
  }

  if (address.country) {
    parts.push(address.country);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function memoryAddressFromRow(row: {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}): MemoryAddressFields {
  return {
    addressLine1: row.address_line_1 ?? "",
    addressLine2: row.address_line_2 ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.postal_code ?? "",
    country: row.country ?? "",
  };
}

export function legalAddressFromRow(row: {
  legal_address_line_1?: string | null;
  legal_address_line_2?: string | null;
  legal_city?: string | null;
  legal_state?: string | null;
  legal_postal_code?: string | null;
  legal_country?: string | null;
  legal_address?: string | null;
}): MemoryAddressFields {
  const structured = {
    addressLine1: row.legal_address_line_1 ?? "",
    addressLine2: row.legal_address_line_2 ?? "",
    city: row.legal_city ?? "",
    state: row.legal_state ?? "",
    postalCode: row.legal_postal_code ?? "",
    country: row.legal_country ?? "",
  };

  if (!formatAddressSummary(structured) && row.legal_address?.trim()) {
    return { ...EMPTY_MEMORY_ADDRESS, addressLine1: row.legal_address.trim() };
  }

  return structured;
}
