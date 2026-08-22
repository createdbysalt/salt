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
import {
  emailEntity,
  firstParticipantEmailEntity,
  verbatimEntity,
} from "../feedback-entity";
import type { PersonSignals } from "@/app/_features/memory/records/person-signals";
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
  const outer = payload as Record<string, unknown>;

  // GOOGLEDRIVE_FILE_CREATED_TRIGGER wraps the resource in a `file`
  // envelope ({ creator, event_type, file }) — verified against the live
  // trigger schema 2026-08-05. Flat payloads (backfill rows) still parse.
  const record =
    typeof outer.file === "object" && outer.file !== null && !Array.isArray(outer.file)
      ? (outer.file as Record<string, unknown>)
      : outer;

  const externalId = (record.id as string) ?? (record.fileId as string);
  if (!externalId) return null;

  const name = (record.name as string) ?? null;
  const mimeType = (record.mimeType as string) ?? null;
  const owners = (record.owners as Array<Record<string, unknown>>) ?? [];
  const creator =
    record !== outer ? (outer.creator as Record<string, unknown> | undefined) : undefined;
  const sharingUser = record.sharingUser as Record<string, unknown> | undefined;

  const participants: EnvelopeParticipant[] = [];

  const ownerLike = creator ? [creator, ...owners] : owners;
  const seen = new Set<string>();
  for (const owner of ownerLike) {
    const email = (owner.emailAddress as string)?.toLowerCase();
    if (email && !seen.has(email)) {
      seen.add(email);
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

  // "Who changed it": sharer beats owner (the sharer is the action's actor).
  const actor = sharingUser ?? ownerLike[0];
  const ownerEmail = ((actor?.emailAddress as string) ?? "").toLowerCase() || null;
  const ownerName = (actor?.displayName as string) ?? null;

  // Drive reports size as a string of bytes (absent for native Docs files).
  const rawSize = record.size;
  const fileSize =
    typeof rawSize === "number"
      ? rawSize
      : typeof rawSize === "string" && rawSize !== ""
        ? parseInt(rawSize, 10)
        : null;

  return {
    sourceType: "googledrive",
    captureType: "file",
    externalId,
    title: name,
    occurredAt: modifiedTime,
    participants,
    threadId: (record.parents as string[])?.[0] ?? null,
    extracted: {
      file_name: name,
      mime_type: mimeType,
      owner_email: ownerEmail,
      owner_name: ownerName,
      file_size: Number.isFinite(fileSize) ? fileSize : null,
      web_view_link: (record.webViewLink as string) ?? null,
      deep_link: (record.webViewLink as string) ?? null,
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

  const pathDisplay = (record.path_display as string) ?? null;
  // Folder = everything before the file name ("/Clients/Acme/brief.pdf" → "/Clients/Acme").
  const folderPath = pathDisplay?.includes("/")
    ? pathDisplay.slice(0, pathDisplay.lastIndexOf("/")) || "/"
    : null;
  const modifiedByEmail =
    typeof sharingInfo?.modified_by === "string" && sharingInfo.modified_by.includes("@")
      ? (sharingInfo.modified_by as string).toLowerCase()
      : null;

  return {
    sourceType: "dropbox",
    captureType: "file",
    externalId,
    title: name,
    occurredAt:
      (record.server_modified as string) ?? (record.client_modified as string) ?? null,
    participants,
    threadId: (record.parent_shared_folder_id as string) ?? null,
    extracted: {
      file_name: name,
      path: pathDisplay,
      folder_path: folderPath,
      owner_email: modifiedByEmail,
      is_folder: isFolder,
      size: (record.size as number) ?? null,
      file_size: (record.size as number) ?? null,
      web_view_link: (record.preview_url as string) ?? null,
      deep_link: (record.preview_url as string) ?? null,
    },
    raw: {
      dropboxId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * OneDrive (Microsoft Graph driveItem). Backfill rows carry the full
 * resource: name, size, webUrl, parentReference.path
 * ("/drive/root:/Clients/Acme"), file.mimeType, lastModifiedBy.user.
 */
function normalizeOneDrive(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId = (record.id as string) ?? (record.itemId as string);
  if (!externalId) return null;

  const name = (record.name as string) ?? null;
  const file = record.file as Record<string, unknown> | undefined;
  const isFolder = record.folder !== undefined && record.folder !== null;

  const parentRef = record.parentReference as Record<string, unknown> | undefined;
  const rawPath = (parentRef?.path as string) ?? null;
  // Graph paths are "/drive/root:/Clients/Acme" — strip the drive prefix.
  const folderPath = rawPath ? rawPath.replace(/^\/drives?\/[^/]*\/?root:?/, "") || "/" : null;

  const modifiedBy = record.lastModifiedBy as Record<string, unknown> | undefined;
  const createdBy = record.createdBy as Record<string, unknown> | undefined;
  const actorUser = ((modifiedBy?.user ?? createdBy?.user) ?? undefined) as
    | Record<string, unknown>
    | undefined;
  const ownerEmail = ((actorUser?.email as string) ?? "").toLowerCase() || null;
  const ownerName = (actorUser?.displayName as string) ?? null;

  const participants: EnvelopeParticipant[] = ownerEmail
    ? [{ email: ownerEmail, name: ownerName, role: "from" }]
    : [];

  return {
    sourceType: "onedrive",
    captureType: "file",
    externalId,
    title: name,
    occurredAt:
      (record.lastModifiedDateTime as string) ??
      (record.createdDateTime as string) ??
      null,
    participants,
    threadId: (parentRef?.id as string) ?? null,
    extracted: {
      file_name: name,
      mime_type: (file?.mimeType as string) ?? null,
      folder_path: folderPath,
      owner_email: ownerEmail,
      owner_name: ownerName,
      file_size: typeof record.size === "number" ? record.size : null,
      web_view_link: (record.webUrl as string) ?? null,
      deep_link: (record.webUrl as string) ?? null,
      is_folder: isFolder,
    },
    raw: {
      fileId: externalId,
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
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveStorageSignals,

    extractFeedbackEntity(envelope) {
      return (
        emailEntity(envelope, "owner_email", "owner") ??
        firstParticipantEmailEntity(envelope, "owner")
      );
    },

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "googledrive":
          return normalizeGoogleDrive(payload);
        case "dropbox":
          return normalizeDropbox(payload);
        case "onedrive":
          return normalizeOneDrive(payload);
        default:
          // Any unknown storage provider gets generic extraction
          return normalizeGenericStorage(payload, provider);
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
