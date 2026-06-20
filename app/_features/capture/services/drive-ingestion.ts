/**
 * Google Drive Ingestion Service
 *
 * Ingests files and documents from Google Drive.
 * Captures file metadata for Memory routing to Files surface.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { CONFIDENCE_THRESHOLDS, BOOTSTRAP_LIMITS } from "../types";
import type { MemorySurface } from "../types";

// ============================================================================
// Types
// ============================================================================

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
  lastModifyingUser?: { displayName?: string; emailAddress?: string };
  size?: string;
  starred?: boolean;
  shared?: boolean;
}

interface IngestionResult {
  success: boolean;
  capturesCreated: number;
  error?: string;
}

// File types to prioritize for capture
const PRIORITY_MIME_TYPES = [
  "application/vnd.google-apps.document", // Google Docs
  "application/vnd.google-apps.spreadsheet", // Google Sheets
  "application/vnd.google-apps.presentation", // Google Slides
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];

// ============================================================================
// Drive Ingestion
// ============================================================================

/**
 * Ingest recent files from Google Drive.
 */
export async function ingestDriveFiles(
  workspaceId: string,
  options: {
    lookbackDays?: number;
    limit?: number;
    isBootstrap?: boolean;
    onlyStarred?: boolean;
  } = {}
): Promise<IngestionResult> {
  const {
    lookbackDays = options.isBootstrap ? 90 : 7,
    limit = options.isBootstrap ? 100 : 30,
    isBootstrap = false,
    onlyStarred = false,
  } = options;

  const admin = createAdminClient();

  // Get Google Drive connection
  const connectionStatus = await getConnectionStatus("googledrive", workspaceId);
  if (!connectionStatus.connected || !connectionStatus.composioConnectionId) {
    return { success: false, capturesCreated: 0, error: "Google Drive not connected" };
  }
  const connectionId = connectionStatus.composioConnectionId;

  // Build query
  const modifiedAfter = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000
  ).toISOString();

  let query = `modifiedTime > '${modifiedAfter}' and trashed = false`;
  if (onlyStarred) {
    query += " and starred = true";
  }

  // Fetch files via Composio
  let files: DriveFile[] = [];
  try {
    const response = await fetch(
      `https://backend.composio.dev/api/v2/actions/GOOGLE_DRIVE_LIST_FILES/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.COMPOSIO_API_KEY!,
        },
        body: JSON.stringify({
          connectedAccountId: connectionId,
          input: {
            q: query,
            pageSize: limit,
            orderBy: "modifiedTime desc",
            fields:
              "files(id,name,mimeType,description,createdTime,modifiedTime,webViewLink,webContentLink,owners,lastModifyingUser,size,starred,shared)",
          },
        }),
      }
    );

    const result = await response.json();
    files = (result.data?.files ?? []) as DriveFile[];
  } catch (error) {
    console.error("[drive-ingestion] Failed to fetch files:", error);
    return { success: false, capturesCreated: 0, error: "Failed to fetch files" };
  }

  if (files.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  // For bootstrap, prioritize important file types
  let filesToCapture = files;
  if (isBootstrap) {
    const priorityFiles = files.filter((f) =>
      PRIORITY_MIME_TYPES.includes(f.mimeType)
    );
    const otherFiles = files.filter(
      (f) => !PRIORITY_MIME_TYPES.includes(f.mimeType)
    );
    filesToCapture = [...priorityFiles.slice(0, 50), ...otherFiles.slice(0, 20)];
  }

  // Check for existing captures
  const externalIds = filesToCapture.map((f) => `google_drive:${f.id}`);
  const { data: existing } = await admin
    .from("capture_events")
    .select("external_id")
    .eq("workspace_id", workspaceId)
    .in("external_id", externalIds);

  const existingIds = new Set(existing?.map((e) => e.external_id) ?? []);
  const newFiles = filesToCapture.filter(
    (f) => !existingIds.has(`google_drive:${f.id}`)
  );

  if (newFiles.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  // Create captures
  const captures = newFiles.map((file) => {
    const fileType = getFileTypeLabel(file.mimeType);
    const sizeLabel = file.size ? formatFileSize(parseInt(file.size, 10)) : null;

    return {
      workspace_id: workspaceId,
      source_type: "google_drive" as const,
      capture_type: "file" as const,
      origin: "found" as const,
      external_id: `google_drive:${file.id}`,
      title: file.name,
      raw_payload: file,
      extracted_data: {
        type: "file",
        file_id: file.id,
        name: file.name,
        mime_type: file.mimeType,
        file_type: fileType,
        description: file.description,
        size: file.size,
        size_label: sizeLabel,
        created_at: file.createdTime,
        modified_at: file.modifiedTime,
        web_link: file.webViewLink,
        owner: file.owners?.[0]?.emailAddress,
        owner_name: file.owners?.[0]?.displayName,
        last_modifier: file.lastModifyingUser?.emailAddress,
        starred: file.starred,
        shared: file.shared,
      },
      state: "pending" as const,
    };
  });

  const { data: insertedCaptures, error: insertError } = await admin
    .from("capture_events")
    .insert(captures)
    .select("id, extracted_data");

  if (insertError) {
    console.error("[drive-ingestion] Failed to insert captures:", insertError);
    return { success: false, capturesCreated: 0, error: "Failed to create captures" };
  }

  // Create routing decisions
  const routingDecisions = insertedCaptures?.flatMap((capture) => {
    const extracted = capture.extracted_data as {
      starred?: boolean;
      file_type?: string;
    };

    const surfaces: Array<{ surface: MemorySurface; confidence: number }> = [
      { surface: "files", confidence: 95 },
    ];

    // Starred or shared files might be project-related
    if (extracted.starred) {
      surfaces.push({ surface: "work", confidence: 70 });
    }

    return surfaces.map(({ surface, confidence }) => ({
      capture_event_id: capture.id,
      target_surface: surface,
      confidence,
      status:
        surface === "files" && confidence >= CONFIDENCE_THRESHOLDS.AUTO_ROUTE
          ? "approved"
          : "pending",
      routing_action: "route" as const,
      routed_at:
        surface === "files" && confidence >= CONFIDENCE_THRESHOLDS.AUTO_ROUTE
          ? new Date().toISOString()
          : null,
    }));
  }) ?? [];

  if (routingDecisions.length > 0) {
    await admin.from("capture_routing_decisions").insert(routingDecisions);
  }

  // Auto-route files to Files surface
  const autoRoutedIds = insertedCaptures?.map((c) => c.id) ?? [];
  if (autoRoutedIds.length > 0) {
    await admin
      .from("capture_events")
      .update({ state: "routed", processed_at: new Date().toISOString() })
      .in("id", autoRoutedIds);
  }

  return { success: true, capturesCreated: insertedCaptures?.length ?? 0 };
}

/**
 * Run Google Drive bootstrap on first connection.
 */
export async function runDriveBootstrap(workspaceId: string): Promise<IngestionResult> {
  console.log(`[drive-ingestion] Running bootstrap for workspace ${workspaceId}`);

  // First, capture starred files (high signal)
  const starredResult = await ingestDriveFiles(workspaceId, {
    isBootstrap: true,
    onlyStarred: true,
    limit: 50,
  });

  // Then, capture recent files
  const recentResult = await ingestDriveFiles(workspaceId, {
    isBootstrap: true,
    lookbackDays: 30,
    limit: 50,
  });

  const totalCreated =
    (starredResult.capturesCreated ?? 0) + (recentResult.capturesCreated ?? 0);

  console.log(
    `[drive-ingestion] Bootstrap complete: ${totalCreated} captures created`
  );

  return {
    success: starredResult.success && recentResult.success,
    capturesCreated: totalCreated,
    error: starredResult.error ?? recentResult.error,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getFileTypeLabel(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.folder": "Folder",
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

  return mimeMap[mimeType] ?? "File";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
