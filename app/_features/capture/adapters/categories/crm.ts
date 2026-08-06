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
import { isRecord, pickString, unwrapRecord } from "../normalize-utils";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownCrmProvider = "hubspot" | "salesforce" | "pipedrive";

const KNOWN_CRM_PROVIDERS: KnownCrmProvider[] = ["hubspot", "salesforce", "pipedrive"];

const CRM_TRIGGER_SLUGS: Record<KnownCrmProvider, string[]> = {
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

function isKnownCrmProvider(provider: string): provider is KnownCrmProvider {
  return KNOWN_CRM_PROVIDERS.includes(provider as KnownCrmProvider);
}

function deriveCrmSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // CRM adapters already filter by category - process all envelopes
    const contactEmail = envelope.extracted.email as string | null;
    if (!contactEmail) continue;

    contacts.set(contactEmail, {
      ...contacts.get(contactEmail),
    });
  }

  return contacts;
}

// CRM adapters already filter by category - no need for source type check

/**
 * HubSpot triggers send ID-only payloads — verified against the live
 * Composio trigger schemas 2026-08-05 (__fixtures__/composio-trigger-schemas.json):
 * { objectId, subscriptionType, subscription_id }. No contact/deal details,
 * so the envelope is a pointer: the external ID keys dedupe and a later
 * enrichment fetch (Outlook pattern) can hydrate names/emails.
 */
function normalizeHubspot(payload: unknown): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;

  const objectId = pickString(payload, ["objectId", "object_id"]);
  const subscriptionType = pickString(payload, [
    "subscriptionType",
    "subscription_type",
  ]);

  // Not the ID-only trigger shape — fall through to generic extraction
  // (backfill rows carry full objects).
  if (!objectId || !subscriptionType) {
    return normalizeGenericCrm(payload, "hubspot" as CaptureSourceType);
  }

  const isContact = subscriptionType.startsWith("contact");

  return {
    sourceType: "hubspot" as CaptureSourceType,
    captureType: isContact ? "contact" : "note",
    // objectId spaces overlap across HubSpot object types — scope by type.
    externalId: `${subscriptionType}:${objectId}`,
    title: `HubSpot: ${subscriptionType}`,
    occurredAt: null,
    participants: [],
    threadId: null,
    extracted: {
      object_id: objectId,
      subscription_type: subscriptionType,
      needs_hydration: true,
    },
    raw: {
      crmId: objectId,
      subscriptionType,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeGenericCrm(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;

  // Try one level of trigger nesting (contact/deal/lead/data envelopes).
  const record = unwrapRecord(payload, ["contact", "deal", "lead", "organization", "data"]);

  const externalId =
    pickString(record, ["id", "Id", "contactId", "contact_id", "objectId", "object_id"]) ??
    pickString(payload, ["id", "Id", "objectId", "object_id"]);
  if (!externalId) return null;

  const name = pickString(record, ["name", "Name", "title"]);
  const email = pickString(record, ["email", "Email"]);

  const participants: EnvelopeParticipant[] = email
    ? [{ email: email.toLowerCase(), name, role: "other" }]
    : [];

  return {
    sourceType,
    captureType: "contact",
    externalId,
    title: name,
    occurredAt:
      pickString(record, ["created_at", "createdAt", "CreatedDate", "add_time"]) ?? null,
    participants,
    threadId: null,
    extracted: {
      name,
      email: email?.toLowerCase() ?? null,
      company: pickString(record, ["company", "org_name"]),
    },
    raw: {
      crmId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Create a CRM adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createCrmCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownCrmProvider(provider)
    ? CRM_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveCrmSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      switch (provider) {
        case "hubspot":
          return normalizeHubspot(payload);
        default:
          // Other CRM providers use generic extraction
          return normalizeGenericCrm(payload, provider as CaptureSourceType);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const crmCategoryAdapters = KNOWN_CRM_PROVIDERS.map(createCrmCategoryAdapter);

/**
 * Get CRM adapter for ANY provider in the CRM category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getCrmAdapter(provider: string): CaptureAdapter {
  return createCrmCategoryAdapter(provider);
}
