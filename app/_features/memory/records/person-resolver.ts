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
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import {
  classifyEntity,
  completePersonFields,
  evaluateAdmission,
  resolveIdentity,
} from "@/app/_features/people/records-engine";
import { loadPeopleProfilePlaybook } from "@/app/_features/plays/playbooks/records-engine/load-profile-playbook";
import { applyProfileFieldResults } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import { executeRecordAction } from "./executor";
import { countCorroboratingCategories } from "./corroboration";
import type { RelationshipType, RecordActionResult } from "./types";

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
  // Cross-app corroboration (registry-wiring Phase 4): only the creation
  // band reads confidence — exact matches and merge suggestions short-circuit
  // before it, so skip the evidence probes for them.
  const corroborationCount =
    duplicates.length === 0
      ? await countCorroboratingCategories(workspaceId, email)
      : 0;
  const decision = evaluateAdmission({
    recordsInput: { ...recordsInput, corroborationCount },
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

  // Name-only twin adoption: a person created without an email (meeting
  // attendee, manual entry) should adopt this address instead of spawning
  // a duplicate. Unique exact-name match only — ambiguity falls through
  // to normal creation.
  if (input.name) {
    const adopted = await adoptNameOnlyPerson(workspaceId, input.name, email, input);
    if (adopted) return adopted;
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
  const result = await executeRecordAction(workspaceId, "system:create-person", {
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

/**
 * Adopt a name-only person record for an incoming email address. Fires
 * when the email lookup missed but exactly one email-less person carries
 * this exact name — the record was born from a source that didn't know
 * the address (a meeting invite list, a manual entry), and this source
 * does. The write goes through the registry's person_email_extracted
 * fillRule so the card's sourcing story and the write path can't drift.
 */
async function adoptNameOnlyPerson(
  workspaceId: string,
  name: string,
  email: string,
  input: PersonResolutionInput
): Promise<PersonResolutionResult | null> {
  const admin = createAdminClient();
  // ilike without wildcards is a case-insensitive exact match; escape
  // pattern metacharacters so a name like "50%_off" can't widen the net.
  const escapedName = name.trim().replace(/[%_\\]/g, (m) => `\\${m}`);
  if (!escapedName) return null;

  const { data: matches } = await admin
    .from("people")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("email", null)
    .ilike("name", escapedName)
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(2);

  if (!matches || matches.length !== 1) return null;
  const person = matches[0];

  await runCareForSignal({
    workspaceId,
    signalKey: "person_email_extracted",
    entityType: "person",
    entityId: person.id,
    evidence: {
      signalValues: { person_email_extracted: email },
      producer: input.sourceType ?? "resolver",
      captureId: input.sourceCaptureId,
    },
  });

  return {
    resolved: true,
    person_id: person.id,
    person_name: person.name ?? name,
    is_new: false,
    confidence: 95,
    confidence_reason: "Existing name-only record adopted this email address",
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
): Promise<RecordActionResult> {
  return executeRecordAction(
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

