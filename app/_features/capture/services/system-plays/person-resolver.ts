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
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import {
  classifyEntity,
  completePersonFields,
  evaluateAdmission,
  resolveIdentity,
} from "@/app/_features/people/records-engine";
import { loadPeopleProfilePlaybook } from "@/app/_features/plays/playbooks/records-engine/load-profile-playbook";
import { applyProfileFieldResults } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
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

export interface PersonEnrichmentHints {
  /** Phone parsed from an email signature. */
  phone?: string;
  /** Company name parsed from an email signature. */
  company?: string;
  /** Job title parsed from an email signature. */
  title?: string;
  /** ISO timestamp of the capture, for first/last contact tracking. */
  contactAt?: string;
}

export interface PersonResolutionInput {
  email: string;
  name?: string;
  signals?: PersonSignals;
  /** LLM-inferred signals (Phase 5.2): admission caps at needs_confirmation. */
  signalsInferred?: boolean;
  /** Source tracking for Memory Care proposal routing. */
  sourceType?: string;
  sourceCaptureId?: string;
  /** Heuristic enrichment from the capture (signature phone/company/title). */
  enrichment?: PersonEnrichmentHints;
}

import {
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
    signalsInferred: input.signalsInferred,
  };
  const classification = classifyEntity(recordsInput);

  const { data: existingPeople } = await admin
    .from("people")
    .select("id, name, email, title, phone")
    .eq("workspace_id", workspaceId)
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

    if (existingPerson?.id) {
      const existingRow = (existingPeople ?? []).find(
        (p) => p.id === existingPerson.id
      );
      await applyPersonEnrichment(workspaceId, existingPerson.id, email, input, {
        // Only propose fields the record doesn't already have — avoids
        // re-accumulating evidence for values that are already set.
        skipPhone: Boolean(existingRow?.phone),
        skipTitle: Boolean(existingRow?.title),
      });
    }

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
      sourceType: input.sourceType,
      sourceCaptureId: input.sourceCaptureId,
    });

    await applyPersonEnrichment(workspaceId, result.entity_id, email, input);
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

// ============================================================================
// Heuristic Enrichment (Phase 3a — free, no LLM)
// ============================================================================

/**
 * Apply capture-derived enrichment to a person through the protected
 * memoryUpdateField tool (confidence-gated: applies at threshold,
 * accumulates as Watching evidence below it).
 *
 * - Signature phone/title → moderate-confidence field proposals
 * - Signature company on a personal-domain sender → org_link proposal
 *   (corporate domains are linked directly by resolveOrg/linkPersonToOrg)
 * - Capture timestamp → first_contact_at / last_contact_at (direct write,
 *   low-stakes timestamps bypass the gate)
 */
async function applyPersonEnrichment(
  workspaceId: string,
  personId: string,
  email: string,
  input: PersonResolutionInput,
  options?: { skipPhone?: boolean; skipTitle?: boolean }
): Promise<void> {
  const enrichment = input.enrichment;
  const sourceDetails = {
    playbookSlug: "memory-records",
    captureId: input.sourceCaptureId,
  };

  try {
    if (enrichment?.phone && !options?.skipPhone) {
      await memoryUpdateField({
        workspaceId,
        entityType: "person",
        entityId: personId,
        field: "phone",
        value: enrichment.phone,
        confidence: 75,
        because: "Phone number parsed from email signature",
        source: "enrichment",
        sourceDetails: { ...sourceDetails, ruleId: "heuristic-signature-phone" },
      });
    }

    if (enrichment?.title && !options?.skipTitle) {
      await memoryUpdateField({
        workspaceId,
        entityType: "person",
        entityId: personId,
        field: "title",
        value: enrichment.title,
        confidence: 65,
        because: "Job title parsed from email signature",
        source: "enrichment",
        sourceDetails: { ...sourceDetails, ruleId: "heuristic-signature-title" },
      });
    }

    // Signature-company org link. Corporate domains are already linked
    // directly by resolveOrg + linkPersonToOrg; this covers the gap where
    // the sender uses a personal domain (gmail etc.) but their signature
    // names a company we already know.
    if (enrichment?.company && isPersonalDomain(email)) {
      const admin = createAdminClient();
      const { data: org } = await admin
        .from("organizations")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .ilike("name", enrichment.company.trim())
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();

      if (org) {
        const { data: existingLink } = await admin
          .from("organization_people")
          .select("id")
          .eq("organization_id", org.id)
          .eq("person_id", personId)
          .maybeSingle();

        if (!existingLink) {
          await memoryUpdateField({
            workspaceId,
            entityType: "person",
            entityId: personId,
            field: "org_link",
            value: org.id,
            confidence: 70,
            because: `Email signature names ${org.name ?? "a known organization"}`,
            source: "enrichment",
            sourceDetails: { ...sourceDetails, ruleId: "heuristic-signature-company-link" },
          });
        }
      }
    }

    // Contact timestamps: low-stakes bookkeeping, written directly.
    if (enrichment?.contactAt) {
      const admin = createAdminClient();
      const { data: person } = await admin
        .from("people")
        .select("first_contact_at, last_contact_at")
        .eq("id", personId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (person) {
        const updates: { first_contact_at?: string; last_contact_at?: string } =
          {};
        if (!person.first_contact_at || enrichment.contactAt < person.first_contact_at) {
          updates.first_contact_at = enrichment.contactAt;
        }
        if (!person.last_contact_at || enrichment.contactAt > person.last_contact_at) {
          updates.last_contact_at = enrichment.contactAt;
        }
        if (Object.keys(updates).length > 0) {
          await admin
            .from("people")
            .update(updates)
            .eq("id", personId)
            .eq("workspace_id", workspaceId);
        }
      }
    }
  } catch (error) {
    // Enrichment is best-effort — never fail person resolution over it
    console.error(
      `[person-resolver] Enrichment failed for person ${personId}:`,
      error
    );
  }
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

