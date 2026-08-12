/**
 * Person field-signal types (Phase 4 of
 * .cursor/plans/2026-08-10-registry-wiring-record-sourcing.md).
 *
 * Leaf module — no imports — so the capture adapter contract
 * (adapters/types.ts) can reference DerivedPersonFields without pulling the
 * producer's server-only dependencies (Care scheduler, memory-tools) into
 * the adapter type graph.
 */

/**
 * 1:1 person field signals a connector payload can carry a value for. Each
 * maps to exactly one registry fillRule ({{extracted}}) on one column.
 * Compound payloads (addresses) travel separately — see
 * PersonAddressExtraction.
 */
export const PERSON_FIELD_SIGNAL_KEYS = [
  "person_name_extracted",
  "person_email_extracted",
  "person_phone_extracted",
  "person_title_extracted",
  "person_timezone_detected",
  "person_billing_email_extracted",
] as const;

export type PersonFieldSignalKey = (typeof PERSON_FIELD_SIGNAL_KEYS)[number];

export type PersonFieldSignalValues = Partial<
  Record<PersonFieldSignalKey, string>
>;

export interface PersonAddressExtraction {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Touchpoint attestation a payload carries (a DM, a completed meeting). The
 * signal names the registry fillRule on lastContactedAt whose confidence /
 * because govern the write — per-source copy stays in the registry, not in
 * adapters.
 */
export type PersonContactSignal =
  | "capture_message_received"
  | "capture_meeting_completed";

export interface PersonContactAttestation {
  /** ISO timestamp of the touchpoint. */
  at: string;
  signal: PersonContactSignal;
}

export interface DerivedPersonFields {
  signalValues: PersonFieldSignalValues;
  address?: PersonAddressExtraction;
  /**
   * Newest touchpoint this batch attests. Direct-written to
   * first/last_contact_at with min/max semantics (never regresses) — the
   * same bookkeeping person-resolver does for email, registry-governed.
   */
  contactAt?: PersonContactAttestation;
}
