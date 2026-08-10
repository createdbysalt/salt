/**
 * Documents Category Adapter (Captures V2 Phase 1).
 *
 * Handles document sources: notion, googledocs, googlesheets, etc.
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

type KnownDocumentsProvider = "notion" | "googledocs" | "googlesheets" | "googleslides";

const KNOWN_DOCUMENTS_PROVIDERS: KnownDocumentsProvider[] = ["notion", "googledocs", "googlesheets", "googleslides"];

const DOCUMENTS_TRIGGER_SLUGS: Record<KnownDocumentsProvider, string[]> = {
  notion: ["NOTION_PAGE_CREATED", "NOTION_PAGE_CONTENT_UPDATED"],
  googledocs: ["GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER", "GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER"],
  // NEW_SPREADSHEET_CREATED watches all new spreadsheets (no ID required).
  // NEW_ROWS_TRIGGER requires a specific spreadsheet ID so it's not included.
  googlesheets: ["GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER"],
  googleslides: ["GOOGLESLIDES_SLIDE_ADDED_TRIGGER"],
};

function isKnownDocumentsProvider(provider: string): provider is KnownDocumentsProvider {
  return KNOWN_DOCUMENTS_PROVIDERS.includes(provider as KnownDocumentsProvider);
}

function deriveDocumentsSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // Documents adapters already filter by category - process all envelopes
    for (const participant of envelope.participants) {
      if (!participant.email) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
      });
    }
  }

  return contacts;
}

// Documents adapters already filter by category - no need for source type check

/**
 * Wrapper keys Composio document triggers nest the resource under —
 * verified against the live trigger schemas 2026-08-05
 * (__fixtures__/composio-trigger-schemas.json):
 *   Google Docs   → { document: {...}, event_type }
 *   Google Sheets → { spreadsheet: {...}, event_type }
 *   Google Slides → { slide: {...}, event_type }
 *   Notion        → flat snake_case ({ page_id, timestamp, ... })
 */
const DOCUMENT_WRAPPER_KEYS = ["document", "spreadsheet", "slide", "page", "file"] as const;

const DOCUMENT_ID_KEYS = [
  "id",
  "documentId",
  "document_id",
  "pageId",
  "page_id",
  "objectId",
  "object_id",
  "spreadsheetId",
  "spreadsheet_id",
  "presentationId",
  "presentation_id",
] as const;

/** Google Drive-style user object ({ emailAddress, displayName }) or legacy ({ email, name }). */
function participantFromUser(
  user: unknown,
  role: EnvelopeParticipant["role"],
): EnvelopeParticipant | null {
  if (!isRecord(user)) return null;
  const email = pickString(user, ["emailAddress", "email_address", "email"]);
  if (!email || !email.includes("@")) return null;
  return {
    email: email.toLowerCase(),
    name: pickString(user, ["displayName", "display_name", "name"]),
    role,
  };
}

function normalizeGenericDocuments(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;

  // Unwrap one level of trigger nesting; the outer record keeps event_type.
  const record = unwrapRecord(payload, DOCUMENT_WRAPPER_KEYS);

  const externalId =
    pickString(record, DOCUMENT_ID_KEYS) ?? pickString(payload, DOCUMENT_ID_KEYS);
  if (!externalId) return null;

  const title = pickString(record, ["title", "name"]);
  const eventType =
    pickString(payload, ["event_type", "eventType"]) ??
    pickString(record, ["event_type", "eventType"]);

  const participants: EnvelopeParticipant[] = [];

  const lastEditor =
    participantFromUser(record.lastModifyingUser, "other") ??
    participantFromUser(record.lastEditedBy, "other");
  if (lastEditor) participants.push(lastEditor);

  if (Array.isArray(record.owners)) {
    for (const owner of record.owners) {
      const participant = participantFromUser(owner, "other");
      if (
        participant &&
        !participants.some((p) => p.email === participant.email)
      ) {
        participants.push(participant);
      }
    }
  }

  const url = pickString(record, ["webViewLink", "web_view_link", "url"]);

  // Notion parent (data.parent.id) or legacy parentId — the grouping pointer.
  const notionData = isRecord(payload.data) ? payload.data : null;
  const notionParent =
    notionData && isRecord(notionData.parent) ? notionData.parent : null;
  const threadId =
    pickString(record, ["parentId", "parent_id"]) ??
    (notionParent ? pickString(notionParent, ["id"]) : null);

  return {
    sourceType,
    captureType: "note",
    externalId,
    title,
    occurredAt:
      pickString(record, [
        "modifiedTime",
        "modified_time",
        "lastEditedTime",
        "last_edited_time",
        "createdTime",
        "created_time",
      ]) ?? pickString(payload, ["timestamp"]),
    participants,
    threadId,
    extracted: {
      title,
      url,
      ...(eventType ? { event_type: eventType } : {}),
    },
    raw: {
      documentId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Create a documents adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createDocumentsCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownDocumentsProvider(provider)
    ? DOCUMENTS_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveDocumentsSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      // All documents providers currently use generic extraction
      return normalizeGenericDocuments(payload, provider);
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const documentsCategoryAdapters = KNOWN_DOCUMENTS_PROVIDERS.map(
  createDocumentsCategoryAdapter
);

/**
 * Get documents adapter for ANY provider in the documents category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getDocumentsAdapter(provider: string): CaptureAdapter {
  return createDocumentsCategoryAdapter(provider);
}
