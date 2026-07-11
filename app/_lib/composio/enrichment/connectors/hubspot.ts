import type { ConnectorManifest } from "../config";

/**
 * HubSpot connector manifest.
 * Defines field mappings for extracting contact and company data from HubSpot CRM.
 */
export const hubspotManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "hubspot-crm",
    name: "HubSpot CRM",
    provider: "hubspot",
    category: "crm",
  },
  enrichment: {
    person: {
      action: "HUBSPOT_SEARCH_CONTACTS",
      query: {
        template: "email:{seed.email}",
        fallback: "firstname:{seed.name}",
      },
      responseSelector: "results",
      fieldMappings: [
        {
          source: "properties.email",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
        {
          source: "properties.firstname",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "properties.lastname",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "properties.phone",
          target: "phone",
          transform: "normalize_phone",
          confidence: "deterministic",
        },
        {
          source: "properties.jobtitle",
          target: "title",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.company",
          target: "company",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "properties.address",
          target: "address_line_1",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.city",
          target: "city",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.state",
          target: "state",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.zip",
          target: "postal_code",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.country",
          target: "country",
          transform: "uppercase",
          confidence: "deterministic",
        },
        {
          source: "properties.website",
          target: "website",
          transform: "direct",
          confidence: "deterministic",
        },
        {
          source: "properties.linkedin_url",
          target: "linkedin_url",
          transform: "direct",
          confidence: "deterministic",
        },
      ],
      connectionMappings: [
        {
          source: "properties.company",
          targetType: "org",
          matchField: "name",
          confidence: 0.8,
        },
      ],
      noteMappings: [
        {
          source: "properties.notes_last_updated",
          template: "HubSpot notes updated: {value}",
        },
      ],
    },
    org: {
      action: "HUBSPOT_SEARCH_COMPANIES",
      query: {
        template: "domain:{seed.domain}",
        fallback: "name:{seed.name}",
      },
      responseSelector: "results",
      fieldMappings: [
        {
          source: "properties.name",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.domain",
          target: "domain",
          transform: "lowercase",
          confidence: "deterministic",
        },
        {
          source: "properties.industry",
          target: "industry_parent",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "properties.address",
          target: "address_line_1",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.city",
          target: "city",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.state",
          target: "state",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.zip",
          target: "postal_code",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.country",
          target: "country",
          transform: "uppercase",
          confidence: "deterministic",
        },
        {
          source: "properties.website",
          target: "website",
          transform: "direct",
          confidence: "deterministic",
        },
        {
          source: "properties.linkedin_company_page",
          target: "linkedin_url",
          transform: "direct",
          confidence: "deterministic",
        },
      ],
    },
    work: {
      action: "HUBSPOT_SEARCH_DEALS",
      query: {
        template: "dealname:{seed.projectName}",
      },
      responseSelector: "results",
      fieldMappings: [
        {
          source: "properties.dealname",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.description",
          target: "description",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "properties.amount",
          target: "base_price_cents",
          transform: "to_cents",
          confidence: "deterministic",
        },
        {
          source: "properties.deal_currency_code",
          target: "currency",
          transform: "uppercase",
          confidence: "deterministic",
        },
      ],
      connectionMappings: [
        {
          source: "associations.companies.results[0].id",
          targetType: "org",
          matchField: "name",
          confidence: 0.7,
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.85,
  },
};
