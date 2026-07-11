import type { ConnectorManifest } from "../config";

/**
 * QuickBooks connector manifest.
 * Defines field mappings for extracting customer and invoice data from QuickBooks.
 */
export const quickbooksManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "quickbooks-accounting",
    name: "QuickBooks Accounting",
    provider: "quickbooks",
    category: "billing",
  },
  enrichment: {
    person: {
      action: "QUICKBOOKS_SEARCH_CUSTOMERS",
      query: {
        template: "DisplayName LIKE '%{seed.name}%'",
        fallback: "PrimaryEmailAddr LIKE '%{seed.email}%'",
      },
      responseSelector: "QueryResponse.Customer",
      fieldMappings: [
        {
          source: "PrimaryEmailAddr.Address",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
        {
          source: "DisplayName",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "PrimaryPhone.FreeFormNumber",
          target: "phone",
          transform: "normalize_phone",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.Line1",
          target: "address_line_1",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.Line2",
          target: "address_line_2",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.City",
          target: "city",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.CountrySubDivisionCode",
          target: "state",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.PostalCode",
          target: "postal_code",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.Country",
          target: "country",
          transform: "uppercase",
          confidence: "deterministic",
        },
        {
          source: "WebAddr.URI",
          target: "website",
          transform: "direct",
          confidence: "deterministic",
        },
      ],
      connectionMappings: [
        {
          source: "CompanyName",
          targetType: "org",
          matchField: "name",
          confidence: 0.8,
        },
      ],
      noteMappings: [
        {
          source: "Notes",
          template: "QuickBooks customer note: {value}",
        },
      ],
    },
    org: {
      action: "QUICKBOOKS_SEARCH_CUSTOMERS",
      query: {
        template: "CompanyName LIKE '%{seed.name}%'",
      },
      responseSelector: "QueryResponse.Customer",
      fieldMappings: [
        {
          source: "CompanyName",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "WebAddr.URI",
          target: "website",
          transform: "direct",
          confidence: "deterministic",
        },
        {
          source: "PrimaryEmailAddr.Address",
          target: "domain",
          transform: "extract_domain",
          confidence: "rule",
        },
        {
          source: "BillAddr.Line1",
          target: "address_line_1",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.City",
          target: "city",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.CountrySubDivisionCode",
          target: "state",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.PostalCode",
          target: "postal_code",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "BillAddr.Country",
          target: "country",
          transform: "uppercase",
          confidence: "deterministic",
        },
      ],
    },
    billing: {
      action: "QUICKBOOKS_QUERY_INVOICES",
      query: {
        template: "CustomerRef LIKE '%{seed.email}%'",
        fallback: "DocNumber = '{seed.invoiceNumber}'",
      },
      responseSelector: "QueryResponse.Invoice",
      fieldMappings: [
        {
          source: "TotalAmt",
          target: "amount_cents",
          transform: "to_cents",
          confidence: "deterministic",
        },
        {
          source: "CurrencyRef.value",
          target: "currency",
          transform: "uppercase",
          confidence: "deterministic",
        },
        {
          source: "DocNumber",
          target: "number",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "DueDate",
          target: "due_at",
          transform: "parse_date",
          confidence: "deterministic",
        },
        {
          source: "CustomerMemo.value",
          target: "description",
          transform: "trim",
          confidence: "deterministic",
        },
      ],
      connectionMappings: [
        {
          source: "CustomerRef.name",
          targetType: "person",
          matchField: "name",
          confidence: 0.85,
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.85,
  },
};
