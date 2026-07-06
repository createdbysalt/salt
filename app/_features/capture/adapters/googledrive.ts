import type { CaptureAdapter, CaptureEnvelope, EnvelopeParticipant } from "./types";

/**
 * Google Drive capture adapter (connector-platform Phase 3.5).
 *
 * Consumes Google Drive API file objects — the per-file shape
 * GOOGLEDRIVE_LIST_FILES returns (data.files[]) and the `file` object the
 * GOOGLEDRIVE_FILE_CREATED_TRIGGER polling trigger nests in its payload.
 * Both shapes verified against the live tool/trigger schemas 2026-07-04.
 */

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/vnd.google-apps.document": "Google Doc",
  "application/vnd.google-apps.spreadsheet": "Google Sheet",
  "application/vnd.google-apps.presentation": "Google Slides",
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word Document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel Spreadsheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint",
  "image/jpeg": "Image",
  "image/png": "Image",
  "image/gif": "Image",
  "video/mp4": "Video",
  "audio/mpeg": "Audio",
};

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toIso(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function personParticipant(value: unknown): EnvelopeParticipant | null {
  if (!isRecord(value)) return null;
  const email = str(value.emailAddress) ?? str(value.email);
  if (!email) return null;
  return {
    email: email.toLowerCase(),
    name: str(value.displayName) ?? str(value.name),
    role: "other",
  };
}

export const googleDriveCaptureAdapter: CaptureAdapter = {
  sourceType: "googledrive",
  toolkit: "googledrive",
  // Verified against GET /api/v3/triggers_types 2026-07-04 (polling trigger;
  // payload = { creator, event_type, file } — normalize unwraps `file`).
  triggerSlugs: ["GOOGLEDRIVE_FILE_CREATED_TRIGGER"],

  normalize(payload: unknown): CaptureEnvelope | null {
    if (!isRecord(payload)) return null;
    // Trigger envelopes may nest the resource under `file`.
    const file = isRecord(payload.file) ? payload.file : payload;

    const externalId = str(file.id) ?? str(file.fileId) ?? str(file.file_id);
    if (!externalId) return null;

    const name = str(file.name) ?? str(file.title);
    if (!name) return null;

    const mimeType = str(file.mimeType) ?? str(file.mime_type);
    // Folders are containers, not memory items; trashed files are tombstones.
    if (mimeType === FOLDER_MIME_TYPE) return null;
    if (file.trashed === true) return null;

    const modifiedAt = toIso(file.modifiedTime ?? file.modified_time);
    const createdAt = toIso(file.createdTime ?? file.created_time);

    const owners = Array.isArray(file.owners) ? file.owners : [];
    const participants: EnvelopeParticipant[] = [];
    for (const owner of owners) {
      const participant = personParticipant(owner);
      if (participant) participants.push(participant);
    }
    const lastModifier = personParticipant(
      file.lastModifyingUser ?? file.last_modifying_user,
    );
    if (
      lastModifier &&
      !participants.some((p) => p.email === lastModifier.email)
    ) {
      participants.push(lastModifier);
    }

    const size = str(file.size);
    const webViewLink = str(file.webViewLink) ?? str(file.web_view_link);

    return {
      sourceType: "googledrive",
      captureType: "file",
      externalId,
      title: name,
      occurredAt: modifiedAt ?? createdAt,
      participants,
      threadId: null,
      extracted: {
        type: "file",
        file_id: externalId,
        name,
        mime_type: mimeType,
        file_type: (mimeType && FILE_TYPE_LABELS[mimeType]) || "File",
        description: str(file.description),
        size,
        created_at: createdAt,
        modified_at: modifiedAt,
        web_link: webViewLink,
        owner: participants[0]?.email ?? null,
        owner_name: participants[0]?.name ?? null,
        starred: file.starred === true,
        shared: file.shared === true,
      },
      // Envelope retention: metadata pointer only; content is parsed on
      // demand (GOOGLEDRIVE_PARSE_FILE) via this id.
      raw: {
        fileId: externalId,
        name,
        mimeType,
        modifiedTime: modifiedAt,
        webViewLink,
        source: "composio",
      },
      // Files bypass the noise gate — the gate models inbox noise.
      noise: null,
    };
  },
};
