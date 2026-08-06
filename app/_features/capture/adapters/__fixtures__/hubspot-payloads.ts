/**
 * Golden payload fixtures for the HubSpot capture adapter.
 *
 * PROVENANCE: derived 2026-08-05 from the live Composio trigger payload
 * schemas (composio-trigger-schemas.json). HubSpot triggers send ID-only
 * payloads: { objectId, subscriptionType, subscription_id }. No contact
 * details — enrichment via a follow-up fetch is a later phase; Phase 1
 * captures the pointer so the event is not lost.
 */

/** HUBSPOT_CONTACT_CREATED_TRIGGER payload. */
export const HUBSPOT_TRIGGER_CONTACT_CREATED = {
  objectId: "901234567",
  subscriptionType: "contact.creation",
  subscription_id: "2743667",
};

/** HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER payload. */
export const HUBSPOT_TRIGGER_DEAL_STAGE_UPDATED = {
  objectId: "18027917381",
  subscriptionType: "deal.propertyChange",
  subscription_id: "2743668",
};

/** Numeric objectId (HubSpot webhooks often send numbers) — must coerce. */
export const HUBSPOT_TRIGGER_NUMERIC_OBJECT_ID = {
  objectId: 901234568,
  subscriptionType: "contact.creation",
  subscription_id: "2743667",
};

/** No objectId — decline. */
export const HUBSPOT_MALFORMED = {
  subscriptionType: "contact.creation",
  subscription_id: "2743667",
};
