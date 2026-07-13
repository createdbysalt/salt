/**
 * CRM Category Adapter (Captures V2 Phase 1).
 *
 * Handles CRM sources: hubspot, salesforce, pipedrive, etc.
 * Stub implementation — enable when connectors are wired.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type CrmProvider = "hubspot" | "salesforce" | "pipedrive";

const CRM_PROVIDERS: CrmProvider[] = ["hubspot", "salesforce", "pipedrive"];

const CRM_TRIGGER_SLUGS: Record<CrmProvider, string[]> = {
  hubspot: [
    "HUBSPOT_CONTACT_CREATED_TRIGGER",
    "HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER",
  ],
  salesforce: [
    "SALESFORCE_ACCOUNT_CREATED_OR_UPDATED_TRIGGER",
    "SALESFORCE_CONTACT_UPDATED_TRIGGER",
    "SALESFORCE_LEAD_CREATED_OR_UPDATED_TRIGGER",
    "SALESFORCE_OPPORTUNITY_UPDATED_TRIGGER",
  ],
  pipedrive: [
    "PIPEDRIVE_NEW_DEAL_TRIGGER",
    "PIPEDRIVE_NEW_ORGANIZATION_TRIGGER",
  ],
};

function deriveCrmSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    if (!isCrmSource(envelope.sourceType)) continue;

    const contactEmail = envelope.extracted.email as string | null;
    if (!contactEmail) continue;

    contacts.set(contactEmail, {
      ...contacts.get(contactEmail),
    });
  }

  return contacts;
}

function isCrmSource(sourceType: CaptureSourceType): boolean {
  return CRM_PROVIDERS.includes(sourceType as CrmProvider);
}

function normalizeGenericCrm(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.Id as string) ??
    (record.contactId as string);
  if (!externalId) return null;

  const name =
    (record.name as string) ??
    (record.Name as string) ??
    null;

  const email =
    (record.email as string) ??
    (record.Email as string) ??
    null;

  const participants: EnvelopeParticipant[] = email
    ? [{ email: email.toLowerCase(), name, role: "other" }]
    : [];

  return {
    sourceType,
    captureType: "contact",
    externalId,
    title: name,
    occurredAt: (record.created_at as string) ?? (record.CreatedDate as string) ?? null,
    participants,
    threadId: null,
    extracted: {
      name,
      email: email?.toLowerCase() ?? null,
      company: (record.company as string) ?? null,
    },
    raw: {
      crmId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

export function createCrmCategoryAdapter(provider: CrmProvider): CaptureAdapter {
  const triggerSlugs = CRM_TRIGGER_SLUGS[provider] ?? [];

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveCrmSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      return normalizeGenericCrm(payload, provider as CaptureSourceType);
    },
  };
}

export const crmCategoryAdapters = CRM_PROVIDERS.map(createCrmCategoryAdapter);

export function getCrmAdapter(provider: string): CaptureAdapter | null {
  if (!CRM_PROVIDERS.includes(provider as CrmProvider)) {
    return null;
  }
  return createCrmCategoryAdapter(provider as CrmProvider);
}
