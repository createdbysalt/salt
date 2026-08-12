/**
 * Org/work field-signal types (Track A of
 * .cursor/plans/wire_every_best_source_4cc27eac.plan.md — CRM org + deal
 * producer).
 *
 * Leaf module — no imports — so the capture adapter contract
 * (adapters/types.ts) can reference DerivedRecordSignals without pulling
 * the producers' server-only dependencies (Care scheduler, memory-tools)
 * into the adapter type graph.
 */

/**
 * 1:1 org field signals a CRM payload can carry a value for. Each maps to
 * exactly one registry fillRule ({{extracted}}) on one column. The compound
 * address stays with the document-reading track — CRM rows carry freeform
 * address strings that can't feed the six-column write honestly.
 */
export const ORG_FIELD_SIGNAL_KEYS = [
  "org_name_extracted",
  "org_industry_inferred",
  "org_subindustry_inferred",
  "org_website_found",
  "org_billing_email_extracted",
] as const;

export type OrgFieldSignalKey = (typeof ORG_FIELD_SIGNAL_KEYS)[number];

export type OrgFieldSignalValues = Partial<Record<OrgFieldSignalKey, string>>;

/**
 * Structured org address from a billing payload (Stripe billing_details /
 * QuickBooks BillAddr). Compound write across six columns by the producer —
 * same pattern as the person address.
 */
export interface DerivedOrgAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface DerivedOrgFields {
  signalValues: OrgFieldSignalValues;
  /** Display name on the CRM account — used to resolve the org record. */
  name?: string;
  /**
   * Contact email on the CRM account. Resolves to a person who gets linked
   * to the org — the primaryContact projection reads organization_people.
   */
  contactEmail?: string;
  /** Billing address on the invoice payload (Track G). */
  address?: DerivedOrgAddress;
  /** Tax ID on the invoice payload (Track G). */
  taxId?: string;
}

/**
 * Deal-derived work field signals. Only the stage is emitted: the value
 * group's best source is the signed contract (document reading), and CRM
 * stage values are mapped onto the work_stage vocabulary inside the
 * adapter — unmappable stages (Pipedrive's pipeline-local numeric ids)
 * never leave the adapter.
 */
export const WORK_FIELD_SIGNAL_KEYS = ["work_stage_inferred"] as const;

export type WorkFieldSignalKey = (typeof WORK_FIELD_SIGNAL_KEYS)[number];

export interface DerivedWorkFields {
  signalValues: Partial<Record<WorkFieldSignalKey, string>>;
  /** Original deal title (the map key is normalized for dedupe). */
  title?: string;
  /** Account name on the deal — narrows work-record matching. */
  orgName?: string;
}

/**
 * Meeting-record field signals (Track B — meeting-intelligence routing).
 * The summary and type ride the signal; attendees are a JSON column the
 * {{extracted}} string path would mangle, so the producer writes them
 * directly (same pattern as the compound person address).
 */
export const MEETING_FIELD_SIGNAL_KEYS = [
  "meeting_type_inferred",
  "meeting_summary_extracted",
] as const;

export type MeetingFieldSignalKey = (typeof MEETING_FIELD_SIGNAL_KEYS)[number];

export interface DerivedMeetingAttendee {
  name: string;
  email?: string;
  role: "client" | "team";
}

export interface DerivedMeetingFields {
  signalValues: Partial<Record<MeetingFieldSignalKey, string>>;
  /** A transcript exists, so the meeting happened (attendance evidence). */
  attendanceEvidence: boolean;
  /** Who actually joined, from the recording app. */
  attendees: DerivedMeetingAttendee[];
  /** Meeting title + start time — the producer's match keys. */
  title?: string;
  occurredAt?: string;
}

/**
 * Record-level derivation beyond per-contact person fields. Orgs are keyed
 * by resolution key — `domain:acme.com` when the payload attests a domain
 * (org email/website, or a contact's email domain), `name:acme corp`
 * otherwise. Deals are keyed by normalized title. Meetings are keyed by the
 * provider's transcript/recording id.
 */
export interface DerivedRecordSignals {
  orgs: Map<string, DerivedOrgFields>;
  deals: Map<string, DerivedWorkFields>;
  meetings?: Map<string, DerivedMeetingFields>;
}
