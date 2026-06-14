/**
 * Intelligence Findings Types
 *
 * Findings are people-centric intelligence extracted by the daily scan.
 * Every finding attaches to a Person or Org — no orphan findings.
 */

import type { MemoryProposal } from "./memory-proposals";

export type FindingType =
  | "revenue_buying" // "What would it cost...", "Do you have availability..."
  | "revenue_closing" // "Let's move forward", "Send me the contract"
  | "revenue_upsell" // Existing client mentions new need
  | "revenue_risk" // "We need to pause", "Budget got cut"
  | "new_person" // Person not in Memory, meets creation criteria
  | "new_org" // Org not in Memory
  | "needs_routing" // Important signal, user picks person/org in Memory
  | "referral" // "Got your name from Sarah"
  | "pending_question" // They asked something, you didn't address
  | "pending_deliverable" // "When can I expect...", "Waiting on..."
  | "pending_reply"; // Thread ended with their message, 3+ days ago

export type FindingState =
  | "needs_you" // Requires human decision
  | "auto_handled" // Salt handled confidently (FYI only)
  | "acted" // User took action
  | "dismissed"; // User dismissed without action

export interface IntelligenceFinding {
  id: string;
  workspace_id: string;
  person_id: string | null;
  org_id: string | null;
  finding_type: FindingType;
  title: string;
  content: string | null;
  evidence: FindingEvidence | null;
  confidence: number; // 0-100
  state: FindingState;
  triggered_plays: TriggeredPlay[] | null;
  corrected_at: string | null;
  corrected_by: string | null;
  correction_reason: string | null;
  flagged_at: string | null;
  flagged_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryAppliedMetadata {
  memory_applied_at?: string;
  memory_applied_entities?: Record<string, string[]>;
  memory_applied_fingerprints?: string[];
}

export interface FindingEvidence {
  source_type: "email" | "stripe" | "calendar" | "quickbooks";
  source_id?: string;
  quotes?: string[];
  metadata?: Record<string, unknown> &
    MemoryAppliedMetadata & {
      memory_proposals?: MemoryProposal[];
      from_email?: string;
      from_name?: string | null;
      thread_id?: string;
    };
}

export interface TriggeredPlay {
  slug: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  executed_at: string;
}

export interface FindingWithContext extends IntelligenceFinding {
  person: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  org: {
    id: string;
    name: null | string;
  } | null;
  /** Resolved deep link to the source email (when evidence points at a Gmail capture). */
  source_url?: string | null;
  /** Parsed from evidence.metadata.memory_proposals */
  memory_proposals?: MemoryProposal[];
  memory_applied_at?: string | null;
}

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  revenue_buying: "Buying Intent",
  revenue_closing: "Ready to Close",
  revenue_upsell: "Upsell Opportunity",
  revenue_risk: "Risk Signal",
  new_person: "New Contact",
  new_org: "New Organization",
  needs_routing: "Route to Profile",
  referral: "Referral",
  pending_question: "Unanswered Question",
  pending_deliverable: "Pending Deliverable",
  pending_reply: "Your Turn to Reply",
};

export const FINDING_TYPE_PRIORITY: Record<FindingType, number> = {
  revenue_closing: 1, // Highest priority
  revenue_buying: 2,
  revenue_upsell: 3,
  revenue_risk: 4,
  pending_deliverable: 5,
  pending_question: 6,
  pending_reply: 7,
  referral: 8,
  needs_routing: 9,
  new_person: 10,
  new_org: 11,
};

export function isRevenueFinding(type: FindingType): boolean {
  return type.startsWith("revenue_");
}

export function isPendingFinding(type: FindingType): boolean {
  return type.startsWith("pending_");
}
