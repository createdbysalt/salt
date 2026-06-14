import "server-only";

/**
 * Person Resolver
 *
 * Resolves an email address to an existing Person or creates a new one.
 * Uses intentional criteria for person creation — not arbitrary "top 15".
 *
 * Creation criteria (at least one must be true):
 * - They paid you (Stripe signal) → auto-create, high confidence
 * - You invoiced them (QuickBooks signal) → auto-create, high confidence
 * - Bidirectional email thread (you replied) → auto-create, medium confidence
 * - You initiated the thread (you reached out) → auto-create, medium confidence
 * - Meeting on calendar with them → auto-create, medium confidence
 * - Email signature contains company/title → evaluate
 *
 * NOT worth creating if:
 * - One-way inbound only (newsletters, notifications)
 * - @noreply, @notifications, @support, etc.
 * - No signature, generic domain, short thread, you never replied
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { executeSystemPlay } from "./executor";
import type { RelationshipType, SystemPlayResult } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface PersonResolutionResult {
  resolved: boolean;
  person_id?: string;
  person_name?: string;
  is_new: boolean;
  confidence: number;
  confidence_reason: string;
  needs_confirmation: boolean;
}

export interface PersonResolutionInput {
  email: string;
  name?: string;
  signals?: PersonSignals;
}

export interface PersonSignals {
  has_stripe_payment?: boolean;
  has_invoice_sent?: boolean;
  is_bidirectional_thread?: boolean;
  you_initiated?: boolean;
  has_calendar_meeting?: boolean;
  has_signature?: boolean;
  email_count?: number;
  last_email_date?: string;
}

// ============================================================================
// Constants
// ============================================================================

const NOISE_EMAIL_PATTERNS = [
  "noreply@",
  "no-reply@",
  "donotreply@",
  "notifications@",
  "newsletter@",
  "marketing@",
  "support@",
  "billing@",
  "automated@",
  "mailer-daemon@",
  "postmaster@",
  "alerts@",
  "updates@",
  "info@",
  "hello@",
  "contact@",
  "team@",
  "sales@",
  "help@",
];

const PERSONAL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "zoho.com",
];

// Confidence thresholds
const CONFIDENCE_AUTO_CREATE = 85;
const CONFIDENCE_NEEDS_CONFIRMATION = 50;

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve an email to an existing Person or determine if one should be created.
 */
export async function resolvePerson(
  workspaceId: string,
  input: PersonResolutionInput
): Promise<PersonResolutionResult> {
  const email = input.email.toLowerCase().trim();

  // Check for noise patterns first
  if (isNoiseEmail(email)) {
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: "Noise email pattern detected",
      needs_confirmation: false,
    };
  }

  const admin = createAdminClient();

  // Check if person already exists
  const { data: existingPerson } = await admin
    .from("people")
    .select("id, name, display_name")
    .eq("studio_id", workspaceId)
    .eq("email", email)
    .is("archived_at", null)
    .maybeSingle();

  if (existingPerson) {
    return {
      resolved: true,
      person_id: existingPerson.id,
      person_name: existingPerson.display_name ?? existingPerson.name,
      is_new: false,
      confidence: 100,
      confidence_reason: "Existing person matched by email",
      needs_confirmation: false,
    };
  }

  // Calculate confidence for creating a new person
  const { confidence, reason, relationshipType } = calculateCreationConfidence(
    email,
    input.signals
  );

  // Below threshold — don't create
  if (confidence < CONFIDENCE_NEEDS_CONFIRMATION) {
    return {
      resolved: false,
      is_new: false,
      confidence,
      confidence_reason: reason,
      needs_confirmation: false,
    };
  }

  // Needs confirmation — surface in "Needs You" queue
  if (confidence < CONFIDENCE_AUTO_CREATE) {
    return {
      resolved: false,
      is_new: true,
      confidence,
      confidence_reason: reason,
      needs_confirmation: true,
    };
  }

  // High confidence — auto-create
  const name = input.name ?? extractNameFromEmail(email);
  const result = await executeSystemPlay(workspaceId, "system:create-person", {
    name,
    email,
    relationship_type: relationshipType,
  });

  if (!result.success) {
    return {
      resolved: false,
      is_new: false,
      confidence,
      confidence_reason: `Creation failed: ${result.error}`,
      needs_confirmation: false,
    };
  }

  return {
    resolved: true,
    person_id: result.entity_id,
    person_name: name,
    is_new: true,
    confidence,
    confidence_reason: reason,
    needs_confirmation: false,
  };
}

/**
 * Create a person after user confirmation (from "Needs You" queue).
 */
export async function createPersonConfirmed(
  workspaceId: string,
  input: {
    email: string;
    name: string;
    relationship_type?: RelationshipType;
  },
  actorUserId?: string
): Promise<SystemPlayResult> {
  return executeSystemPlay(
    workspaceId,
    "system:create-person",
    {
      name: input.name,
      email: input.email,
      relationship_type: input.relationship_type ?? "unknown",
    },
    actorUserId
  );
}

// ============================================================================
// Confidence Calculation
// ============================================================================

function calculateCreationConfidence(
  email: string,
  signals?: PersonSignals
): {
  confidence: number;
  reason: string;
  relationshipType: RelationshipType;
} {
  let confidence = 0;
  const reasons: string[] = [];
  let relationshipType: RelationshipType = "unknown";

  // Stripe payment — highest signal
  if (signals?.has_stripe_payment) {
    confidence += 50;
    reasons.push("Has Stripe payment");
    relationshipType = "client";
  }

  // Invoice sent — high signal
  if (signals?.has_invoice_sent) {
    confidence += 45;
    reasons.push("You invoiced them");
    if (relationshipType === "unknown") relationshipType = "client";
  }

  // Calendar meeting — good signal
  if (signals?.has_calendar_meeting) {
    confidence += 30;
    reasons.push("Calendar meeting exists");
  }

  // Bidirectional thread — good signal
  if (signals?.is_bidirectional_thread) {
    confidence += 25;
    reasons.push("Bidirectional email thread");
  }

  // You initiated — medium signal
  if (signals?.you_initiated) {
    confidence += 20;
    reasons.push("You initiated contact");
    if (relationshipType === "unknown") relationshipType = "prospect";
  }

  // Email signature — medium signal
  if (signals?.has_signature) {
    confidence += 15;
    reasons.push("Has email signature");
  }

  // Email frequency — minor signal
  if (signals?.email_count && signals.email_count >= 3) {
    confidence += 10;
    reasons.push(`${signals.email_count} emails exchanged`);
  }

  // Company domain (not personal) — minor signal
  const domain = email.split("@")[1];
  if (domain && !PERSONAL_DOMAINS.includes(domain)) {
    confidence += 5;
    reasons.push("Company email domain");
  }

  // Cap at 100
  confidence = Math.min(100, confidence);

  return {
    confidence,
    reason: reasons.length > 0 ? reasons.join("; ") : "No strong signals",
    relationshipType,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isNoiseEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  return NOISE_EMAIL_PATTERNS.some((pattern) => lowerEmail.includes(pattern));
}

function extractNameFromEmail(email: string): string {
  const localPart = email.split("@")[0];
  // Convert "john.doe" or "john_doe" to "John Doe"
  return localPart
    .replace(/[._-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extract domain from email for Org resolution.
 */
export function extractDomain(email: string): string | null {
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2) return null;

  const domain = parts[1];

  // Skip personal domains
  if (PERSONAL_DOMAINS.includes(domain)) return null;

  return domain;
}

/**
 * Check if an email is from a personal domain.
 */
export function isPersonalDomain(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  return domain ? PERSONAL_DOMAINS.includes(domain) : true;
}
