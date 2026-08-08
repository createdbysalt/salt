import type { ConnectorCategory, EnrichableEntityType } from "./types";
import { getCaptureCategory } from "../capture-categories";

export const ENTITY_ENRICHMENT_CATEGORIES: Record<EnrichableEntityType, ConnectorCategory[]> = {
  person: ["email", "calendar", "billing", "crm", "meetings", "documents", "communication"],
  org: ["billing", "crm", "documents", "email"],
  work: ["project_management", "documents", "billing", "email", "calendar"],
  billing: ["email", "billing", "documents"],
  meeting: ["calendar", "email", "meetings", "documents"],
  file: ["documents", "storage", "email"],
  me: ["email", "calendar", "billing"],
};

export const PERSON_FIELD_SCHEMA = {
  identity: ["name", "email", "phone", "billing_email", "timezone"],
  role: ["title", "organization"],
  relationship: ["relationship_type"],
  location: ["address_line_1", "address_line_2", "city", "state", "postal_code", "country"],
} as const;

export const ORG_FIELD_SCHEMA = {
  identity: ["name", "domain", "website"],
  contact: ["billing_email"],
  classification: ["industry", "estimated_company_size"],
  location: ["address_line_1", "address_line_2", "city", "state", "postal_code", "country"],
} as const;

export const WORK_FIELD_SCHEMA = {
  core: ["name", "description"],
  type: ["work_type"],
  timeline: ["deadline", "start_date", "status"],
  financials: ["contract_value_cents", "currency", "hourly_rate_cents", "hours_estimate"],
  billing: ["payment_type", "payment_terms", "billing_cycle", "retainer_mrr_cents", "po_number"],
} as const;

export const CATEGORY_PROVIDES_FIELDS: Record<ConnectorCategory, Partial<Record<EnrichableEntityType, string[]>>> = {
  email: {
    person: ["name", "phone", "title", "organization"],
    org: ["name", "domain"],
    work: ["name", "description"],
    billing: ["amount_cents", "currency", "due_date", "invoice_number"],
    meeting: ["attendees", "subject"],
    file: ["description", "related_people", "related_orgs"],
    me: [],
  },
  calendar: {
    person: ["timezone", "organization"],
    org: [],
    work: ["deadline", "start_date"],
    billing: [],
    meeting: ["start_time", "end_time", "location", "attendees", "recurrence"],
    file: [],
    me: ["availability_patterns"],
  },
  billing: {
    person: ["billing_email", "address_line_1", "address_line_2", "city", "state", "postal_code", "country", "relationship_type"],
    org: ["billing_email", "address_line_1", "address_line_2", "city", "state", "postal_code", "country"],
    work: ["contract_value_cents", "currency", "payment_type", "payment_terms"],
    billing: ["amount_cents", "currency", "status", "customer_name", "customer_email"],
    meeting: [],
    file: ["amount_cents", "currency"],
    me: ["total_revenue", "mrr"],
  },
  crm: {
    person: ["title", "phone", "relationship_type"],
    org: ["industry", "estimated_company_size"],
    work: ["status"],
    billing: [],
    meeting: [],
    file: [],
    me: [],
  },
  meetings: {
    person: [],
    org: [],
    work: [],
    billing: [],
    meeting: ["transcript", "summary", "action_items"],
    file: [],
    me: [],
  },
  documents: {
    person: [],
    org: [],
    work: ["description"],
    billing: [],
    meeting: ["agenda", "notes"],
    file: ["content_summary", "extracted_text"],
    me: [],
  },
  storage: {
    person: [],
    org: [],
    work: [],
    billing: [],
    meeting: [],
    file: ["file_name", "file_size", "created_at", "modified_at", "shared_with", "folder_path"],
    me: [],
  },
  project_management: {
    person: [],
    org: [],
    work: ["status", "deadline", "description", "assignee"],
    billing: [],
    meeting: [],
    file: [],
    me: [],
  },
  communication: {
    person: ["name"],
    org: [],
    work: [],
    billing: [],
    meeting: [],
    file: [],
    me: [],
  },
};

export function getCategoriesForEntity(entityType: EnrichableEntityType): ConnectorCategory[] {
  return ENTITY_ENRICHMENT_CATEGORIES[entityType];
}

/**
 * Category for a provider key, from `connector_overrides.capture_category`
 * (DB-backed, cached; frozen fallback when the DB is unreachable).
 */
export async function getCategoryForConnector(
  connector: string,
): Promise<ConnectorCategory | null> {
  return getCaptureCategory(connector);
}

export function getFieldsForCategory(
  category: ConnectorCategory,
  entityType: EnrichableEntityType
): string[] {
  return CATEGORY_PROVIDES_FIELDS[category]?.[entityType] ?? [];
}
