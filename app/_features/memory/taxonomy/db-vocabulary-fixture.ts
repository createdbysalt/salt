/**
 * DB CHECK-constraint introspection fixture (keeper-field-contracts,
 * verification Layer 3).
 *
 * Postgres CHECK constraints don't appear in the generated Supabase types
 * (enums do — those are compared straight from `Constants.public.Enums`).
 * This fixture mirrors the CHECK-constrained vocabulary sets on the linked
 * staging project so vocabulary-parity.test.ts can assert
 * registry === DB === UI without a live connection.
 *
 * REFRESH after any migration that touches these constraints. Source query
 * (run against the linked project, e.g. via `supabase db dump` or SQL editor):
 *
 *   SELECT conrelid::regclass AS table, conname, pg_get_constraintdef(oid)
 *   FROM pg_constraint
 *   WHERE contype = 'c' AND connamespace = 'public'::regnamespace
 *     AND conrelid::regclass::text IN
 *       ('people','organizations','projects','meetings',
 *        'meeting_templates','billing_records','billing_payments')
 *   ORDER BY 1, 2;
 *
 * Constraint provenance (migration that last defined each set):
 * - people.relationship_type / organizations.relationship_status:
 *     20260702110000_field_contract_vocab_repair.sql
 * - projects.status: 20251228050000_fix_projects_constraints.sql
 * - meetings.meeting_type / meeting_templates.meeting_type:
 *     20260702110000_field_contract_vocab_repair.sql
 * - meetings.status / location_type:
 *     20260104000003_create_client_meetings.sql
 * - billing_records.currency / billing_payments.currency:
 *     20260703180000_currency_uppercase_canon.sql (uppercase ISO-4217, 10-value
 *     canon — same set as the registry `currency` vocabulary)
 * - people/organizations.record_status:
 *     20260702120000_record_status_and_meeting_contact.sql
 */

export const DB_CHECK_VOCABULARIES = {
  /** people.relationship_type + organizations.relationship_status (shared canon) */
  relationship_type: [
    "client",
    "prospect",
    "lead",
    "past_client",
    "team",
    "partner",
    "vendor",
    "personal",
    "unknown",
  ],
  /** projects.status */
  work_status: ["draft", "signed", "active", "on_hold", "completed", "archived"],
  /** meetings.meeting_type + meeting_templates.meeting_type */
  meeting_type: [
    "discovery",
    "kickoff",
    "check-in",
    "review",
    "presentation",
    "workshop",
    "interview",
    "other",
  ],
  /** meetings.status */
  meeting_status: ["scheduled", "completed", "cancelled", "no-show"],
  /** meetings.location_type */
  meeting_location_type: ["google-meet", "zoom", "phone", "in-person", "custom"],
  /** billing_records.currency + billing_payments.currency (uppercase ISO-4217 canon) */
  billing_currency: [
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "AUD",
    "CHF",
    "JPY",
    "SGD",
    "NZD",
    "INR",
  ],
  /** people.record_status + organizations.record_status */
  record_status: ["active", "inactive"],
} as const;
