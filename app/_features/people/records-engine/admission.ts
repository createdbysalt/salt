import { isPersonalDomain } from "@/app/_features/capture/services/system-plays/person-signals";
import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import type {
  ExistingPersonCandidate,
  RecordsClassification,
  RecordsDecision,
  RecordsInput,
} from "./types";

export const RECORDS_CONFIDENCE_AUTO_CREATE = 85;
export const RECORDS_CONFIDENCE_NEEDS_CONFIRMATION = 50;

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function relationshipFromSignals(input: RecordsInput): RelationshipType {
  if (input.relationshipType) return input.relationshipType;
  if (
    input.signals?.has_payment_received ||
    input.signals?.has_stripe_payment ||
    input.signals?.has_invoice_sent
  ) {
    return "client";
  }
  if (input.signals?.you_initiated) return "prospect";
  return "unknown";
}

export function calculateAdmissionConfidence(
  input: RecordsInput,
  classification: Pick<RecordsClassification, "normalizedEmail" | "entityType">,
): { confidence: number; reasons: string[] } {
  let confidence = 0;
  const reasons: string[] = [];

  if (input.explicitRequest) {
    confidence += 70;
    reasons.push("User explicitly asked Salt to track this person");
  }
  if (input.signals?.has_payment_received || input.signals?.has_stripe_payment) {
    confidence += 50;
    reasons.push("Has finance payment evidence");
  }
  if (input.signals?.has_invoice_sent) {
    confidence += 45;
    reasons.push("You invoiced them");
  }
  if (input.signals?.has_calendar_meeting) {
    confidence += 30;
    reasons.push("Calendar meeting exists");
  }
  if (input.signals?.is_bidirectional_thread) {
    confidence += 25;
    reasons.push("Bidirectional email thread");
  }
  if (input.signals?.you_initiated) {
    confidence += 20;
    reasons.push("You initiated contact");
  }
  if (input.signals?.has_signature) {
    confidence += 15;
    reasons.push("Has email signature");
  }
  if (input.signals?.email_count && input.signals.email_count >= 3) {
    confidence += 10;
    reasons.push(`${input.signals.email_count} emails exchanged`);
  }
  if (classification.normalizedEmail) {
    confidence += 10;
    reasons.push("Has a valid email identity");
    if (!isPersonalDomain(classification.normalizedEmail)) {
      confidence += 5;
      reasons.push("Company email domain");
    }
  }
  if (input.name?.trim()) {
    confidence += 10;
    reasons.push("Human name provided");
  }

  if (classification.entityType !== "person") {
    confidence = Math.min(confidence, RECORDS_CONFIDENCE_NEEDS_CONFIRMATION);
  }

  return {
    confidence: clampConfidence(confidence),
    reasons: reasons.length > 0 ? reasons : ["No strong signals"],
  };
}

export function evaluateAdmission(input: {
  recordsInput: RecordsInput;
  classification: RecordsClassification;
  duplicates?: ExistingPersonCandidate[];
}): RecordsDecision {
  const { recordsInput, classification, duplicates = [] } = input;
  const exactDuplicate = duplicates.find((candidate) => {
    const email = candidate.email?.trim().toLowerCase();
    return email && email === classification.normalizedEmail;
  });
  const suggestedRelationshipType = relationshipFromSignals(recordsInput);
  const suggestedFields = {
    name: classification.suggestedName ?? undefined,
    email: classification.normalizedEmail ?? undefined,
    relationship_type: suggestedRelationshipType,
    title: recordsInput.title ?? null,
    org_domain: classification.domain,
  };

  if (exactDuplicate) {
    return {
      entityType: "person",
      action: "update_existing",
      confidence: 100,
      reasons: ["Existing person matched by email"],
      normalizedEmail: classification.normalizedEmail,
      domain: classification.domain,
      suggestedName: classification.suggestedName,
      suggestedRelationshipType,
      duplicates: [exactDuplicate],
      suggestedFields,
    };
  }

  if (classification.entityType === "suspicious") {
    return {
      entityType: "suspicious",
      action: "skip",
      confidence: 0,
      reasons: [...classification.reasons, "Suspicious senders are never auto-created"],
      normalizedEmail: classification.normalizedEmail,
      domain: classification.domain,
      suggestedName: classification.suggestedName,
      suggestedRelationshipType,
      duplicates,
      suggestedFields,
    };
  }

  if (classification.entityType === "system_sender" || classification.entityType === "newsletter") {
    return {
      entityType: classification.entityType,
      action: recordsInput.userInsistsPerson ? "needs_confirmation" : "skip",
      confidence: recordsInput.userInsistsPerson ? RECORDS_CONFIDENCE_NEEDS_CONFIRMATION : 0,
      reasons: [
        ...classification.reasons,
        recordsInput.userInsistsPerson
          ? "User override requires confirmation"
          : "Automated or broadcast senders should not become people",
      ],
      normalizedEmail: classification.normalizedEmail,
      domain: classification.domain,
      suggestedName: classification.suggestedName,
      suggestedRelationshipType,
      duplicates,
      suggestedFields,
    };
  }

  if (classification.entityType === "shared_alias") {
    return {
      entityType: "shared_alias",
      action: recordsInput.userInsistsPerson ? "needs_confirmation" : "suggest_org",
      confidence: RECORDS_CONFIDENCE_NEEDS_CONFIRMATION,
      reasons: [
        ...classification.reasons,
        recordsInput.userInsistsPerson
          ? "Shared alias can become a person only with confirmation"
          : "Shared aliases should become organization contact points by default",
      ],
      normalizedEmail: classification.normalizedEmail,
      domain: classification.domain,
      suggestedName: classification.suggestedName,
      suggestedRelationshipType,
      duplicates,
      suggestedFields,
    };
  }

  if (classification.entityType === "organization") {
    return {
      entityType: "organization",
      action: "suggest_org",
      confidence: RECORDS_CONFIDENCE_NEEDS_CONFIRMATION,
      reasons: [...classification.reasons, "Organization-only input should route to org creation"],
      normalizedEmail: classification.normalizedEmail,
      domain: classification.domain,
      suggestedName: classification.suggestedName,
      suggestedRelationshipType,
      duplicates,
      suggestedFields,
    };
  }

  if (classification.entityType === "source_artifact") {
    return {
      entityType: "source_artifact",
      action: "skip",
      confidence: 0,
      reasons: classification.reasons,
      normalizedEmail: classification.normalizedEmail,
      domain: classification.domain,
      suggestedName: classification.suggestedName,
      suggestedRelationshipType,
      duplicates,
      suggestedFields,
    };
  }

  if (duplicates.length > 0) {
    return {
      entityType: "person",
      action: "suggest_merge",
      confidence: RECORDS_CONFIDENCE_NEEDS_CONFIRMATION,
      reasons: ["Possible duplicate person found; merge requires review"],
      normalizedEmail: classification.normalizedEmail,
      domain: classification.domain,
      suggestedName: classification.suggestedName,
      suggestedRelationshipType,
      duplicates,
      suggestedFields,
    };
  }

  const { confidence, reasons } = calculateAdmissionConfidence(recordsInput, classification);
  const action =
    confidence >= RECORDS_CONFIDENCE_AUTO_CREATE
      ? "create"
      : confidence >= RECORDS_CONFIDENCE_NEEDS_CONFIRMATION
        ? "needs_confirmation"
        : "skip";

  return {
    entityType: "person",
    action,
    confidence,
    reasons,
    normalizedEmail: classification.normalizedEmail,
    domain: classification.domain,
    suggestedName: classification.suggestedName,
    suggestedRelationshipType,
    duplicates,
    suggestedFields,
  };
}
