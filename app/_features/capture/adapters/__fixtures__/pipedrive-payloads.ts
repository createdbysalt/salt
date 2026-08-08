/**
 * Golden payload fixtures for the Pipedrive capture adapter.
 *
 * PROVENANCE: synthesized 2026-08-01 from the Pipedrive webhook payload
 * shapes for deal/organization creation — not yet captured live. Replace
 * with live rows when the first Pipedrive triggers fire against a real
 * account.
 */

/** New deal trigger payload. */
export const PIPEDRIVE_TRIGGER_NEW_DEAL = {
  id: "42",
  title: "Retainer renewal",
  value: "2500",
  currency: "USD",
  status: "open",
  stage_id: "3",
};

/** New organization trigger payload. */
export const PIPEDRIVE_TRIGGER_NEW_ORGANIZATION = {
  id: "77",
  name: "Acme Creative",
  email: "hello@acmecreative.co",
};
