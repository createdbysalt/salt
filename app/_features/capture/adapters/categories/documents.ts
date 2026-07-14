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

function normalizeGenericDocuments(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.documentId as string) ??
    (record.pageId as string);
  if (!externalId) return null;

  const title =
    (record.title as string) ??
    (record.name as string) ??
    null;

  const lastEditor = record.lastEditedBy as Record<string, unknown> | undefined;
  const participants: EnvelopeParticipant[] = [];

  if (lastEditor?.email) {
    participants.push({
      email: (lastEditor.email as string).toLowerCase(),
      name: (lastEditor.name as string) ?? null,
      role: "other",
    });
  }

  return {
    sourceType,
    captureType: "note",
    externalId,
    title,
    occurredAt:
      (record.lastEditedTime as string) ??
      (record.modifiedTime as string) ??
      (record.createdTime as string) ??
      null,
    participants,
    threadId: (record.parentId as string) ?? null,
    extracted: {
      title,
      url: (record.url as string) ?? null,
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
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveDocumentsSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      // All documents providers currently use generic extraction
      return normalizeGenericDocuments(payload, provider as CaptureSourceType);
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
