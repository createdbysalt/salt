/**
 * Salt capability vocabulary (plan 2026-07-07 WS3.4).
 *
 * The intent keys a playbook step may declare instead of a hardcoded tool slug.
 * Salt owns this vocabulary; the `tool_capabilities` table maps each key to the
 * concrete tools (per provider) that satisfy it. Keep this in sync with the
 * seed migration — a key here with no rows simply resolves to null at runtime
 * (the step no-ops), never an error.
 */
export const CAPABILITY_KEYS = [
  "read_email",
  "send_message",
  "draft_message",
  "read_contacts",
  "read_calendar",
  "create_event",
  "update_event",
  "read_bookings",
  "read_files",
  "read_payments",
  "read_invoices",
  "create_invoice",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

const CAPABILITY_KEY_SET = new Set<string>(CAPABILITY_KEYS);

export function isCapabilityKey(value: string): value is CapabilityKey {
  return CAPABILITY_KEY_SET.has(value);
}

/**
 * The approval unit for a capability act step. The concrete tool slug is
 * resolved at runtime, so the capability key itself is what gets recorded in a
 * play's requiredActions / approved_actions and gated on — namespaced so it
 * never collides with a real tool slug.
 */
export function capabilityAction(capabilityKey: string): string {
  return `capability:${capabilityKey}`;
}

/** Read-class capabilities — allowed in fetch steps (which may only read). */
export const READ_CAPABILITY_KEYS = new Set<string>([
  "read_email",
  "read_contacts",
  "read_calendar",
  "read_bookings",
  "read_files",
  "read_payments",
  "read_invoices",
]);
