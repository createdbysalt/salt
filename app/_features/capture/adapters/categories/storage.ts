/**
 * Storage Category Adapter (Captures V2 Phase 1).
 *
 * Handles all file storage sources: googledrive, dropbox, onedrive, etc.
 * Routes by provider for provider-specific parsing.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownStorageProvider = "googledrive" | "dropbox" | "onedrive";

const KNOWN_STORAGE_PROVIDERS: KnownStorageProvider[] = ["googledrive", "dropbox", "onedrive"];

const STORAGE_TRIGGER_SLUGS: Record<KnownStorageProvider, string[]> = {
  googledrive: ["GOOGLEDRIVE_FILE_CREATED_TRIGGER"],
  dropbox: [], // No triggers available yet - backfill only
  onedrive: [], // No triggers available yet - backfill only
};

function isKnownStorageProvider(provider: string): provider is KnownStorageProvider {
  return KNOWN_STORAGE_PROVIDERS.includes(provider as KnownStorageProvider);
}

function deriveStorageSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // Storage adapters already filter by category - process all envelopes
    for (const participant of envelope.participants) {
      if (!participant.email) continue;
      if (isSelf(participant.email, context.userEmail)) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
        // Files shared indicate relationship; no dedicated signal yet
      });
    }
  }

  return contacts;
}

function isSelf(email: string | null, userEmail: string | null): boolean {
  if (!email || !userEmail) return false;
  return email.toLowerCase() === userEmail.toLowerCase();
}

// Storage adapters already filter by category - no need for source type check

function normalizeGoogleDrive(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId = (record.id as string) ?? (record.fileId as string);
  if (!externalId) return null;

  const name = (record.name as string) ?? null;
  const mimeType = (record.mimeType as string) ?? null;
  const owners = (record.owners as Array<Record<string, unknown>>) ?? [];
  const sharingUser = record.sharingUser as Record<string, unknown> | undefined;

  const participants: EnvelopeParticipant[] = [];

  for (const owner of owners) {
    const email = (owner.emailAddress as string)?.toLowerCase();
    if (email) {
      participants.push({
        email,
        name: (owner.displayName as string) ?? null,
        role: "other",
      });
    }
  }

  if (sharingUser?.emailAddress) {
    participants.push({
      email: (sharingUser.emailAddress as string).toLowerCase(),
      name: (sharingUser.displayName as string) ?? null,
      role: "from",
    });
  }

  const modifiedTime =
    (record.modifiedTime as string) ?? (record.createdTime as string) ?? null;

  return {
    sourceType: "googledrive" as CaptureSourceType,
    captureType: "file",
    externalId,
    title: name,
    occurredAt: modifiedTime,
    participants,
    threadId: (record.parents as string[])?.[0] ?? null,
    extracted: {
      file_name: name,
      mime_type: mimeType,
      web_view_link: (record.webViewLink as string) ?? null,
      is_folder: mimeType === "application/vnd.google-apps.folder",
    },
    raw: {
      fileId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeDropbox(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId = (record.id as string) ?? (record.path_lower as string);
  if (!externalId) return null;

  const name = (record.name as string) ?? null;
  const isFolder = record[".tag"] === "folder";
  const sharingInfo = record.sharing_info as Record<string, unknown> | undefined;

  const participants: EnvelopeParticipant[] = [];
  if (sharingInfo?.modified_by) {
    const modifiedBy = sharingInfo.modified_by as string;
    if (modifiedBy.includes("@")) {
      participants.push({
        email: modifiedBy.toLowerCase(),
        name: null,
        role: "from",
      });
    }
  }

  return {
    sourceType: "dropbox" as CaptureSourceType,
    captureType: "file",
    externalId,
    title: name,
    occurredAt:
      (record.server_modified as string) ?? (record.client_modified as string) ?? null,
    participants,
    threadId: (record.parent_shared_folder_id as string) ?? null,
    extracted: {
      file_name: name,
      path: (record.path_display as string) ?? null,
      is_folder: isFolder,
      size: (record.size as number) ?? null,
    },
    raw: {
      dropboxId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeGenericStorage(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ?? (record.fileId as string) ?? (record.path as string);
  if (!externalId) return null;

  const name =
    (record.name as string) ?? (record.fileName as string) ?? null;

  return {
    sourceType,
    captureType: "file",
    externalId,
    title: name,
    occurredAt:
      (record.modifiedTime as string) ??
      (record.modified_at as string) ??
      (record.created_at as string) ??
      null,
    participants: [],
    threadId: null,
    extracted: {
      file_name: name,
    },
    raw: {
      fileId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Create a storage adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createStorageCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownStorageProvider(provider)
    ? STORAGE_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveStorageSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "googledrive":
          return normalizeGoogleDrive(payload);
        case "dropbox":
          return normalizeDropbox(payload);
        default:
          // Any unknown storage provider gets generic extraction
          return normalizeGenericStorage(payload, provider as CaptureSourceType);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const storageCategoryAdapters = KNOWN_STORAGE_PROVIDERS.map(
  createStorageCategoryAdapter
);

/**
 * Get storage adapter for ANY provider in the storage category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getStorageAdapter(provider: string): CaptureAdapter {
  return createStorageCategoryAdapter(provider);
}
