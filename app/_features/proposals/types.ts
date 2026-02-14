/**
 * Proposals Feature - Types
 *
 * Type definitions for the proposals/contracts system.
 * Includes proposal content, templates, payment schedules, and e-signature audit trail.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const PROPOSAL_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  VIEWED: "viewed",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const;

export type ProposalStatus = (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

export const PAYMENT_STATUS = {
  PENDING: "pending",
  INVOICED: "invoiced",
  PAID: "paid",
  OVERDUE: "overdue",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// =============================================================================
// PAYMENT SCHEDULE
// =============================================================================

export interface PaymentScheduleItem {
  amount: number;
  due_date: string; // ISO date string
  description: string;
  status: PaymentStatus;
}

// =============================================================================
// SIGNATURE AUDIT TRAIL
// =============================================================================

export interface SignatureGeolocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface SignatureAuditTrail {
  signature_name: string;
  signature_email: string;
  signature_ip: string;
  signature_user_agent: string;
  signature_geolocation?: SignatureGeolocation;
  signed_at: string; // ISO datetime
  document_hash: string; // SHA-256 hash
  terms_version?: string;
  consent_checkbox_text?: string;
  signing_link_id?: string;
  signing_session_id?: string;
}

// =============================================================================
// PROPOSAL CONTENT
// =============================================================================

export interface ProposalSection {
  id: string;
  title: string;
  content: string; // Rich text / markdown content
  order: number;
}

export interface ProposalContent {
  sections: ProposalSection[];
}

// =============================================================================
// PROPOSAL TERMS
// =============================================================================

export interface ProposalTerms {
  validity_days?: number;
  payment_terms?: string;
  cancellation_policy?: string;
  revision_policy?: string;
  ownership_clause?: string;
  confidentiality_clause?: string;
  custom_terms?: string;
}

// =============================================================================
// PROPOSAL
// =============================================================================

export interface Proposal {
  id: string;
  studio_id: string;
  client_id: string;
  intake_id?: string | null;
  public_id: string;

  // Content
  title: string;
  content: ProposalContent;
  template_id?: string | null;

  // Pricing
  total_amount?: number | null;
  currency: Currency;
  payment_schedule: PaymentScheduleItem[];

  // Terms
  terms: ProposalTerms;

  // Status
  status: ProposalStatus;
  sent_at?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  expires_at?: string | null;

  // E-signature audit trail
  signature_name?: string | null;
  signature_email?: string | null;
  signature_ip?: string | null;
  signature_user_agent?: string | null;
  signature_geolocation?: SignatureGeolocation | null;
  signed_at?: string | null;
  document_hash?: string | null;
  terms_version?: string | null;
  consent_checkbox_text?: string | null;
  signing_link_id?: string | null;
  signing_session_id?: string | null;

  // Payment tracking
  deposit_amount?: number | null;
  deposit_paid: boolean;
  deposit_paid_at?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_invoice_id?: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PROPOSAL TEMPLATE
// =============================================================================

export interface ProposalTemplate {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  content: ProposalContent;
  default_terms: ProposalTerms;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// DEFAULT TEMPLATE DEFINITION (for code-based templates)
// =============================================================================

export interface DefaultTemplateDefinition {
  name: string;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    defaultContent: string;
  }>;
  defaultTerms: ProposalTerms;
}

// =============================================================================
// PROPOSAL WITH RELATIONS
// =============================================================================

export interface ProposalWithClient extends Proposal {
  client: {
    id: string;
    name: string;
    email: string;
    company_name?: string | null;
  };
}

// =============================================================================
// ACTION INPUT TYPES
// =============================================================================

export interface CreateProposalInput {
  client_id: string;
  title: string;
  template_id?: string;
  intake_id?: string;
  /** Generate proposal from AI-extracted intelligence */
  fromIntelligence?: boolean;
}

export interface UpdateProposalInput {
  id: string;
  title?: string;
  content?: ProposalContent;
  total_amount?: number;
  currency?: Currency;
  payment_schedule?: PaymentScheduleItem[];
  terms?: ProposalTerms;
}

export interface SignProposalInput {
  proposal_id: string;
  signature_name: string;
  signature_email: string;
  signature_ip: string;
  signature_user_agent: string;
  signature_geolocation?: SignatureGeolocation;
}

export interface SendProposalInput {
  proposal_id: string;
  recipient_email: string;
  custom_message?: string;
}
