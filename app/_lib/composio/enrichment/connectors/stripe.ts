import type { ConnectorManifest } from "../config";

/**
 * Stripe connector manifest.
 * Defines field mappings for extracting customer data from Stripe.
 */
export const stripeManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "stripe-customers",
    name: "Stripe Customers",
    provider: "stripe",
    category: "billing",
    apiVersion: "2024-06-20",
  },
  enrichment: {
    person: {
      action: "STRIPE_SEARCH_CUSTOMERS",
      query: {
        template: "email:'{seed.email}'",
        fallback: "name:'{seed.name}'",
      },
      responseSelector: "data",
      fieldMappings: [
        {
          source: "email",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
        {
          source: "name",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "phone",
          target: "phone",
          transform: "normalize_phone",
          confidence: "deterministic",
        },
        {
          source: "address.line1",
          target: "address_line_1",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "address.line2",
          target: "address_line_2",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "address.city",
          target: "city",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "address.state",
          target: "state",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "address.postal_code",
          target: "postal_code",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "address.country",
          target: "country",
          transform: "uppercase",
          confidence: "deterministic",
        },
      ],
      connectionMappings: [
        {
          source: "metadata.company",
          targetType: "org",
          matchField: "name",
          confidence: 0.7,
        },
      ],
      noteMappings: [
        {
          source: "description",
          template: "Stripe customer note: {value}",
        },
      ],
    },
    org: {
      action: "STRIPE_LIST_CUSTOMERS",
      query: {
        template: "email:~'@{seed.domain}'",
      },
      responseSelector: "data",
      fieldMappings: [
        {
          source: "metadata.company_name",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "email",
          target: "domain",
          transform: "extract_domain",
          confidence: "rule",
        },
      ],
    },
    billing: {
      action: "STRIPE_LIST_INVOICES",
      query: {
        template: "customer:'{seed.email}'",
      },
      responseSelector: "data",
      fieldMappings: [
        {
          source: "amount_due",
          target: "amount_cents",
          transform: "direct",
          confidence: "deterministic",
        },
        {
          source: "currency",
          target: "currency",
          transform: "uppercase",
          confidence: "deterministic",
        },
        {
          source: "status",
          target: "status",
          transform: "lowercase",
          confidence: "deterministic",
        },
        {
          source: "number",
          target: "number",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "due_date",
          target: "due_at",
          transform: "parse_date",
          confidence: "deterministic",
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.85,
  },
};
