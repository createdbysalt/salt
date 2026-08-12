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
import {
  emailEntity,
  firstParticipantEmailEntity,
  verbatimEntity,
} from "../feedback-entity";
import { isRecord, pickString, unwrapRecord } from "../normalize-utils";
import {
  extractDomain,
  isPersonalDomain,
  type PersonSignals,
} from "@/app/_features/capture/services/system-plays/person-signals";
import type { DerivedPersonFields } from "@/app/_features/capture/services/producers/person-field-types";
import type {
  DerivedOrgFields,
  DerivedRecordSignals,
  DerivedWorkFields,
} from "@/app/_features/capture/services/producers/record-field-types";
import { WORK_STAGE_SETS } from "@/app/_features/memory/taxonomy/registry";
import type { CaptureSourceType } from "@/app/_features/capture/types";

/**
 * Pipedrive persons carry email/phone as arrays of { value, primary }.
 * Returns the primary entry's value (fallback: first entry).
 */
function pickFirstValue(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value.filter(isRecord);
  const primary = entries.find((entry) => entry.primary === true) ?? entries[0];
  const picked = primary?.value;
  return typeof picked === "string" && picked.length > 0 ? picked : undefined;
}

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

/**
 * Field-signal derivation (registry-wiring Phase 4): CRM contact rows
 * attest the person's name, job title, and phone. Organization-shaped rows
 * (entity_type "organization") are skipped — org fields are a Phase 5
 * producer.
 */
function deriveCrmFieldSignals(
  envelopes: readonly CaptureEnvelope[],
): Map<string, DerivedPersonFields> {
  const contacts = new Map<string, DerivedPersonFields>();

  for (const envelope of envelopes) {
    if (envelope.extracted.entity_type === "organization") continue;
    const email = envelope.extracted.email as string | null;
    if (!email) continue;

    const existing = contacts.get(email) ?? { signalValues: {} };
    const name = envelope.extracted.name as string | null;
    const jobTitle = envelope.extracted.job_title as string | null;
    const phone = envelope.extracted.phone as string | null;
    if (name && !existing.signalValues.person_name_extracted) {
      existing.signalValues.person_name_extracted = name;
    }
    if (jobTitle && !existing.signalValues.person_title_extracted) {
      existing.signalValues.person_title_extracted = jobTitle;
    }
    if (phone && !existing.signalValues.person_phone_extracted) {
      existing.signalValues.person_phone_extracted = phone;
    }
    contacts.set(email, existing);
  }

  return contacts;
}

// CRM adapters already filter by category - no need for source type check

// ============================================================================
// Record-signal derivation (Track A: org + deal producer)
// ============================================================================

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Website URL → registrable domain; personal domains never key an org. */
function domainFromWebsite(website: string | null): string | null {
  if (!website) return null;
  const match = /^(?:https?:\/\/)?(?:www\.)?([^/?\s]+)/i.exec(website.trim());
  const domain = match?.[1]?.toLowerCase();
  if (!domain || isPersonalDomain(`probe@${domain}`)) return null;
  return domain;
}

const KNOWN_WORK_STAGE_SLUGS = new Set(
  Object.values(WORK_STAGE_SETS).flatMap((stages) => stages),
);

/**
 * Stage names CRMs actually use → work_stage slugs. Direct slug matches
 * (after normalization) win; this table covers the near-misses. Anything
 * else — Pipedrive's pipeline-local numeric ids, custom stages — emits
 * nothing rather than guessing.
 */
const CRM_STAGE_ALIASES: Record<string, string> = {
  negotiation: "negotiating",
  "contract sent": "negotiating",
  "closed won": "won",
  "closed lost": "lost",
  "in progress": "in_progress",
};

function mapCrmDealStage(stage: unknown, status: unknown): string | undefined {
  const statusText =
    typeof status === "string" ? status.trim().toLowerCase() : "";
  if (statusText === "won" || statusText === "lost") return statusText;
  if (typeof stage !== "string") return undefined;
  const normalized = stage
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const slug = normalized.replace(/ /g, "_");
  if (KNOWN_WORK_STAGE_SLUGS.has(slug)) return slug;
  return CRM_STAGE_ALIASES[normalized];
}

/**
 * CRM industry values → the industry vocabulary (parent + optional child).
 * Covers HubSpot's standard industry list and the common freeform names;
 * unmapped values emit nothing.
 */
const CRM_INDUSTRY_MAP: Record<string, { parent: string; child?: string }> = {
  accounting: { parent: "professional_services", child: "accounting" },
  legal: { parent: "professional_services", child: "legal" },
  "legal services": { parent: "professional_services", child: "legal" },
  consulting: { parent: "professional_services", child: "consulting" },
  "management consulting": {
    parent: "professional_services",
    child: "consulting",
  },
  coaching: { parent: "professional_services", child: "coaching" },
  technology: { parent: "technology" },
  tech: { parent: "technology" },
  software: { parent: "technology", child: "saas" },
  saas: { parent: "technology", child: "saas" },
  "computer software": { parent: "technology", child: "saas" },
  "information technology": { parent: "technology" },
  "information technology and services": { parent: "technology" },
  devtools: { parent: "technology", child: "devtools" },
  "artificial intelligence": { parent: "technology", child: "ai_ml" },
  design: { parent: "creative", child: "design" },
  "graphic design": { parent: "creative", child: "design" },
  photography: { parent: "creative", child: "photography" },
  video: { parent: "creative", child: "video" },
  "video production": { parent: "creative", child: "video" },
  branding: { parent: "creative", child: "branding" },
  writing: { parent: "creative", child: "writing" },
  copywriting: { parent: "creative", child: "writing" },
  healthcare: { parent: "healthcare" },
  "hospital & health care": { parent: "healthcare" },
  wellness: { parent: "healthcare", child: "wellness" },
  "mental health": { parent: "healthcare", child: "mental_health" },
  "real estate": { parent: "real_estate" },
  "commercial real estate": { parent: "real_estate", child: "commercial" },
  "residential real estate": { parent: "real_estate", child: "residential" },
  "property management": { parent: "real_estate", child: "property_management" },
  restaurant: { parent: "retail_hospitality", child: "restaurant" },
  restaurants: { parent: "retail_hospitality", child: "restaurant" },
  retail: { parent: "retail_hospitality", child: "retail" },
  ecommerce: { parent: "retail_hospitality", child: "ecommerce" },
  "e commerce": { parent: "retail_hospitality", child: "ecommerce" },
  hospitality: { parent: "retail_hospitality" },
  nonprofit: { parent: "other", child: "nonprofit" },
  "non profit": { parent: "other", child: "nonprofit" },
  education: { parent: "other", child: "education" },
  government: { parent: "other", child: "government" },
};

function mapCrmIndustry(
  value: unknown,
): { parent: string; child?: string } | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  return CRM_INDUSTRY_MAP[normalized];
}

/**
 * Record-signal derivation (Track A): organization rows attest the org's
 * name/website/billing email/industry; deal rows attest the work stage and
 * the account name; contact rows attest the account name (keyed by the
 * contact's business domain so domain-created orgs pick up the CRM's
 * curated name).
 */
function deriveCrmRecordSignals(
  envelopes: readonly CaptureEnvelope[],
): DerivedRecordSignals {
  const orgs = new Map<string, DerivedOrgFields>();
  const deals = new Map<string, DerivedWorkFields>();

  const orgEntry = (key: string): DerivedOrgFields => {
    const existing = orgs.get(key);
    if (existing) return existing;
    const created: DerivedOrgFields = { signalValues: {} };
    orgs.set(key, created);
    return created;
  };

  const attestOrgName = (key: string, name: string) => {
    const entry = orgEntry(key);
    entry.name ??= name;
    entry.signalValues.org_name_extracted ??= name;
  };

  for (const envelope of envelopes) {
    const entityType = envelope.extracted.entity_type;

    if (entityType === "organization") {
      const name = envelope.extracted.name as string | null;
      const email = envelope.extracted.email as string | null;
      const website = envelope.extracted.website as string | null;
      const domain =
        (email ? extractDomain(email) : null) ?? domainFromWebsite(website);
      const key = domain
        ? `domain:${domain}`
        : name
          ? `name:${normalizeKey(name)}`
          : null;
      if (!key) continue;

      const entry = orgEntry(key);
      if (name) {
        entry.name ??= name;
        entry.signalValues.org_name_extracted ??= name;
      }
      if (website) entry.signalValues.org_website_found ??= website;
      if (email) {
        entry.contactEmail ??= email;
        entry.signalValues.org_billing_email_extracted ??= email;
      }
      const industry = mapCrmIndustry(envelope.extracted.industry);
      if (industry) {
        entry.signalValues.org_industry_inferred ??= industry.parent;
        if (industry.child) {
          entry.signalValues.org_subindustry_inferred ??= industry.child;
        }
      }
      continue;
    }

    if (entityType === "deal") {
      const title = envelope.extracted.entity_name as string | null;
      if (!title) continue;
      const company = envelope.extracted.company as string | null;
      const stage = mapCrmDealStage(
        envelope.extracted.stage,
        envelope.extracted.status,
      );

      const key = normalizeKey(title);
      const existing = deals.get(key) ?? { signalValues: {} };
      existing.title ??= title;
      if (stage) existing.signalValues.work_stage_inferred ??= stage;
      if (company) existing.orgName ??= company;
      deals.set(key, existing);

      if (company) attestOrgName(`name:${normalizeKey(company)}`, company);
      continue;
    }

    // Contact rows: the company field attests the account name.
    const company = envelope.extracted.company as string | null;
    if (company) {
      const email = envelope.extracted.email as string | null;
      const domain = email ? extractDomain(email) : null;
      attestOrgName(
        domain ? `domain:${domain}` : `name:${normalizeKey(company)}`,
        company,
      );
    }
  }

  return { orgs, deals };
}

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
  const record = unwrapRecord(payload, ["deal", "organization", "person", "data"]);

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

  // Person shape: Pipedrive persons carry email/phone as arrays of
  // { value, primary } and a job_title — organization rows never do.
  const isPerson =
    record.job_title !== undefined ||
    record.phone !== undefined ||
    Array.isArray(record.email);

  if (isPerson) {
    const name = pickString(record, ["name"]);
    const email = pickFirstValue(record.email) ?? pickString(record, ["email"]);
    const phone = pickFirstValue(record.phone) ?? pickString(record, ["phone"]);
    const jobTitle = pickString(record, ["job_title"]);

    return {
      sourceType: "pipedrive",
      captureType: "contact",
      externalId: `person:${externalId}`,
      title: name,
      occurredAt: pickString(record, ["add_time", "created_at"]) ?? null,
      participants: email
        ? [{ email: email.toLowerCase(), name, role: "other" }]
        : [],
      threadId: null,
      extracted: {
        entity_type: "contact",
        entity_name: name,
        name,
        email: email?.toLowerCase() ?? null,
        phone: phone ?? null,
        job_title: jobTitle ?? null,
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
      industry: pickString(record, ["industry"]),
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
  const phone =
    pickString(record, ["phone", "Phone", "phone_number", "PhoneNumber"]) ??
    pickFirstValue(record.phone);
  const jobTitle = pickString(record, [
    "job_title",
    "jobTitle",
    "Title",
    "JobTitle",
  ]);
  const dealValue = parseDealValue(record.value ?? record.amount ?? record.Amount);
  const isDealLike =
    dealValue !== null ||
    record.stage_id !== undefined ||
    record.stage !== undefined;
  const website = pickString(record, ["web", "website", "Website"]);
  const industry = pickString(record, ["industry", "Industry"]);
  // Organization shape: carries account fields (website/industry) and no
  // person fields (job title). Checked after deals so deal rows with a
  // website-bearing account still classify as deals.
  const isOrgLike =
    !isDealLike && !jobTitle && (website !== null || industry !== null);

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
      entity_type: isDealLike ? "deal" : isOrgLike ? "organization" : "contact",
      entity_name: name,
      name,
      email: email?.toLowerCase() ?? null,
      company: isOrgLike ? name : pickString(record, ["company", "org_name"]),
      status: pickString(record, ["status", "Status"]),
      stage: pickString(record, ["stage", "stage_id", "StageName", "dealstage"]),
      deal_value: dealValue,
      currency: pickString(record, ["currency", "CurrencyIsoCode"]),
      phone: phone ?? null,
      job_title: jobTitle ?? null,
      website: website ?? null,
      industry: industry ?? null,
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
    deriveFieldSignals: deriveCrmFieldSignals,
    deriveRecordSignals: deriveCrmRecordSignals,

    extractFeedbackEntity(envelope) {
      return (
        emailEntity(envelope, "email", "contact") ??
        firstParticipantEmailEntity(envelope, "contact")
      );
    },

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
