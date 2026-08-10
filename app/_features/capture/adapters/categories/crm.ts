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

// hubspot is dormant: demoted to action-only (Sources plan 5.7, 2026-08-08)
// because its triggers require the user's own developer-app credentials. Its
// capture_category is NULL in the DB, so this parsing is unreachable until
// re-enabled by data — keep the code so re-enabling is a pure data change.
type KnownCrmProvider = "hubspot" | "salesforce" | "pipedrive";

const KNOWN_CRM_PROVIDERS: KnownCrmProvider[] = ["hubspot", "salesforce", "pipedrive"];

const CRM_TRIGGER_SLUGS: Record<KnownCrmProvider, string[]> = {
  hubspot: [
    "HUBSPOT_CONTACT_CREATED_TRIGGER",
    "HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER",
  ],
  salesforce: [], // SALESFORCE_* trigger slugs 404 upstream — no subscribable triggers
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
    return normalizeGenericCrm(payload, "hubspot");
  }

  const isContact = subscriptionType.startsWith("contact");

  return {
    sourceType: "hubspot",
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

/**
 * Deal value normalization: CRM values are already major units (dollars) —
 * Pipedrive sends them as strings ("2500"), HubSpot as numbers. Same decimal-
 * dollar semantics as billing (capture-detail-contract.md), no /100 anywhere.
 */
function parseDealValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Pipedrive triggers — verified against the live Composio trigger schemas
 * 2026-08-05: deals are flat { id, title, value (string), currency, status,
 * stage_id }; organizations are flat { id, name, email, address, web }.
 */
function normalizePipedrive(payload: unknown): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;
  const record = unwrapRecord(payload, ["deal", "organization", "data"]);

  const externalId = pickString(record, ["id"]) ?? pickString(payload, ["id"]);
  if (!externalId) return null;

  // Deal shape has title+value/stage; organization shape has name.
  const isDeal =
    record.value !== undefined ||
    record.stage_id !== undefined ||
    (record.title !== undefined && record.name === undefined);

  if (isDeal) {
    const title = pickString(record, ["title"]);
    return {
      sourceType: "pipedrive",
      captureType: "note",
      // IDs overlap between Pipedrive object types — scope the dedupe key.
      externalId: `deal:${externalId}`,
      title,
      occurredAt: pickString(record, ["add_time", "created_at"]) ?? null,
      participants: [],
      threadId: null,
      extracted: {
        entity_type: "deal",
        entity_name: title,
        name: title,
        status: pickString(record, ["status"]),
        stage: pickString(record, ["stage_id", "stage_name"]),
        deal_value: parseDealValue(record.value),
        currency: pickString(record, ["currency"]),
        company: pickString(record, ["org_name"]),
      },
      raw: {
        crmId: externalId,
        source: "composio_trigger",
      },
      noise: null,
    };
  }

  const name = pickString(record, ["name"]);
  const email = pickString(record, ["email"]);

  return {
    sourceType: "pipedrive",
    captureType: "contact",
    externalId: `organization:${externalId}`,
    title: name,
    occurredAt: pickString(record, ["add_time", "created_at"]) ?? null,
    participants: email
      ? [{ email: email.toLowerCase(), name, role: "other" }]
      : [],
    threadId: null,
    extracted: {
      entity_type: "organization",
      entity_name: name,
      name,
      email: email?.toLowerCase() ?? null,
      website: pickString(record, ["web"]),
      company: name,
    },
    raw: {
      crmId: externalId,
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
  const dealValue = parseDealValue(record.value ?? record.amount ?? record.Amount);
  const isDealLike = dealValue !== null || record.stage_id !== undefined;

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
      entity_type: isDealLike ? "deal" : "contact",
      entity_name: name,
      name,
      email: email?.toLowerCase() ?? null,
      company: pickString(record, ["company", "org_name"]),
      status: pickString(record, ["status", "Status"]),
      stage: pickString(record, ["stage", "stage_id", "StageName", "dealstage"]),
      deal_value: dealValue,
      currency: pickString(record, ["currency", "CurrencyIsoCode"]),
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
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveCrmSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      switch (provider) {
        case "hubspot":
          return normalizeHubspot(payload);
        case "pipedrive":
          return normalizePipedrive(payload);
        default:
          // Other CRM providers use generic extraction
          return normalizeGenericCrm(payload, provider);
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
