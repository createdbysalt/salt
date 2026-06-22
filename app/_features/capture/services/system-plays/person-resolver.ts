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
import {
  classifyEntity,
  completePersonFields,
  evaluateAdmission,
  resolveIdentity,
} from "@/app/_features/people/records-engine";
import { loadPeopleProfilePlaybook } from "@/app/_features/plays/playbooks/profile/load-profile-playbook";
import { applyProfileFieldResults } from "@/app/_features/plays/playbooks/profile/write-provenance";
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

import {
  extractDomain,
  extractNameFromEmail,
  isPersonalDomain,
  type PersonSignals,
} from "./person-signals";

export {
  extractDomain,
  extractNameFromEmail,
  isPersonalDomain,
  type PersonSignals,
} from "./person-signals";

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
  const admin = createAdminClient();
  const recordsInput = {
    email,
    name: input.name,
    signals: input.signals,
  };
  const classification = classifyEntity(recordsInput);

  const { data: existingPeople } = await admin
    .from("people")
    .select("id, name, email, title")
    .eq("studio_id", workspaceId)
    .eq("email", email)
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(5);

  const duplicates = resolveIdentity({
    recordsInput,
    candidates: (existingPeople ?? []).map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      title: person.title,
    })),
  });
  const decision = evaluateAdmission({
    recordsInput,
    classification,
    duplicates,
  });

  if (decision.action === "update_existing") {
    const existingPerson = decision.duplicates[0];
    return {
      resolved: true,
      person_id: existingPerson?.id,
      person_name: existingPerson?.name,
      is_new: false,
      confidence: decision.confidence,
      confidence_reason: decision.reasons.join("; "),
      needs_confirmation: false,
    };
  }

  if (decision.action === "skip" || decision.action === "suggest_org") {
    return {
      resolved: false,
      is_new: false,
      confidence: decision.confidence,
      confidence_reason: decision.reasons.join("; "),
      needs_confirmation: false,
    };
  }

  if (decision.action === "needs_confirmation" || decision.action === "suggest_merge") {
    return {
      resolved: false,
      is_new: true,
      confidence: decision.confidence,
      confidence_reason: decision.reasons.join("; "),
      needs_confirmation: true,
    };
  }

  const profilePlaybook = await loadPeopleProfilePlaybook(workspaceId);
  const profileEvaluation = completePersonFields({
    email,
    signals: input.signals,
    systemRules: profilePlaybook.systemRules,
    settings: profilePlaybook.settings,
    blueprintVersion: profilePlaybook.blueprintVersion,
  });
  const relationshipType = profileEvaluation.relationshipType;

  // High confidence — auto-create
  const name = decision.suggestedName ?? input.name ?? extractNameFromEmail(email);
  const result = await executeSystemPlay(workspaceId, "system:create-person", {
    name,
    email,
    relationship_type: relationshipType,
  });

  if (!result.success) {
    return {
      resolved: false,
      is_new: false,
      confidence: decision.confidence,
      confidence_reason: `Creation failed: ${result.error}`,
      needs_confirmation: false,
    };
  }

  if (result.entity_id) {
    await applyProfileFieldResults({
      workspaceId,
      personId: result.entity_id,
      results: profileEvaluation.results,
      blueprintSlug: profileEvaluation.blueprintSlug,
      blueprintVersion: profileEvaluation.blueprintVersion,
    });
  }

  return {
    resolved: true,
    person_id: result.entity_id,
    person_name: name,
    is_new: true,
    confidence: decision.confidence,
    confidence_reason: decision.reasons.join("; "),
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


