import "server-only";

/**
 * Email attachment ingestion (2026-09-08).
 *
 * The capture pipeline historically stored attachment METADATA only — bytes
 * never left the mail provider, so email-born resources were named after a
 * filename and "analyzed" against the email body excerpt. For document-class
 * attachments (agreements, contracts, SOWs, proposals, invoices) that meant
 * Salt could never actually read the document.
 *
 * This service closes the gap for gmail captures:
 *
 *   capture (attachment metadata + attachmentId pointer)
 *     → GMAIL_GET_ATTACHMENT (metered read via executeComposioAction)
 *     → bytes fetched from the signed URL
 *     → uploaded to bridge-files storage
 *     → resources row created/updated WITH bucket_id/object_path/mime_type
 *     → analyzeResourceContent({ force }) re-reads on the real document
 *     → entity_links to sibling work/billing records born from the capture
 *
 * Scope is deliberately narrow: document-class attachments only (PDF/DOCX or
 * contract-vocabulary filenames), never inline images/logos, 25MB cap. Runs
 * unattended from the evidence pipeline; every vendor call is metered at the
 * primitive (Composio via executeComposioAction, LLM via sendLlm inside
 * content analysis).
 */

import { randomUUID } from "crypto";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { getGmailAttachment, getGmailMessage } from "@/app/_lib/composio/actions";
import { findPersonIdsByEmail } from "@/app/_features/memory/records/person-emails";
import { analyzeResourceContent } from "./content-analysis";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Gmail's per-message attachment ceiling; larger files surface as Drive links. */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const STORAGE_BUCKET = "bridge-files";

const DOCUMENT_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** Contract-vocabulary filenames are document-class even without a known mime. */
const DOCUMENT_NAME_PATTERN =
  /agreement|contract|\bsow\b|statement of work|proposal|quote|invoice|receipt|scope of work|\bterms\b|\bnda\b|\bw-?9\b/i;

export interface EmailAttachmentMeta {
  name: string;
  contentType?: string;
  size?: number;
  attachmentId?: string;
}

export interface EmailAttachmentIngestResult {
  attempted: number;
  ingested: number;
  skipped: number;
  errors: string[];
  resourceIds: string[];
}

/** Document-class filter: real documents only, never inline images/logos. */
export function isDocumentClassAttachment(attachment: EmailAttachmentMeta): boolean {
  const mime = attachment.contentType?.toLowerCase();
  if (mime?.startsWith("image/")) return false;
  if (typeof attachment.size === "number" && attachment.size > MAX_ATTACHMENT_BYTES) return false;
  if (mime && DOCUMENT_MIMES.has(mime)) return true;
  return DOCUMENT_NAME_PATTERN.test(attachment.name);
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned.length > 0 ? cleaned : "attachment";
}

function readAttachments(extracted: Record<string, unknown>): EmailAttachmentMeta[] {
  const raw = extracted.attachments;
  if (!Array.isArray(raw)) return [];
  const out: EmailAttachmentMeta[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ name: item });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = (record.name as string) || (record.filename as string) || "";
    if (!name.trim()) continue;
    out.push({
      name,
      contentType: (record.contentType as string) || (record.mimeType as string) || undefined,
      size: typeof record.size === "number" ? record.size : undefined,
      attachmentId:
        (record.attachmentId as string) || (record.attachment_id as string) || undefined,
    });
  }
  return out;
}

interface GmailPartShape {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number };
  parts?: GmailPartShape[];
}

/** Walk payload.parts for the attachmentId of a filename (hydration fallback). */
function findAttachmentIdByName(root: unknown, fileName: string): string | null {
  const stack: GmailPartShape[] = [root as GmailPartShape];
  while (stack.length > 0) {
    const part = stack.pop();
    if (!part || typeof part !== "object") continue;
    if (part.filename === fileName && part.body?.attachmentId) {
      return part.body.attachmentId;
    }
    for (const child of part.parts ?? []) stack.push(child);
  }
  return null;
}

async function downloadBytes(s3url: string): Promise<Buffer | null> {
  const response = await fetch(s3url);
  if (!response.ok || !response.body) return null;
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_ATTACHMENT_BYTES) return null;
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_ATTACHMENT_BYTES) return null;
  return Buffer.from(arrayBuffer);
}

/**
 * Find the resource this attachment belongs to: an existing email-born row
 * from the same capture (matched by attachment filename or the capture's
 * subject-derived title), so bytes land on the row evidence already created
 * instead of birthing a duplicate.
 */
async function findExistingResource(
  supabase: AdminClient,
  workspaceId: string,
  captureId: string,
  attachmentName: string,
): Promise<{ id: string; file_name: string; hasBytes: boolean } | null> {
  const { data } = await supabase
    .from("resources")
    .select("id, file_name, bucket_id, object_path")
    .eq("workspace_id", workspaceId)
    .eq("capture_event_id", captureId)
    .is("deleted_at", null);
  const rows = (data ?? []) as Array<{
    id: string;
    file_name: string;
    bucket_id: string | null;
    object_path: string | null;
  }>;
  const hasBytes = (row: { bucket_id: string | null; object_path: string | null }) =>
    Boolean(row.bucket_id && row.object_path);
  const byName = rows.find((r) => r.file_name === attachmentName);
  // The single-row fallback exists to attach bytes to a metadata-only
  // evidence birth (named after the email subject). A row that already has
  // bytes belongs to a DIFFERENT attachment from the same email — multi-
  // document captures must birth one resource per document.
  const only = rows.length === 1 && !hasBytes(rows[0]) ? rows[0] : null;
  const match = byName ?? only ?? null;
  return match
    ? { id: match.id, file_name: match.file_name, hasBytes: hasBytes(match) }
    : null;
}

/** Link the resource to work/billing records born from the same capture. */
async function linkCaptureSiblings(
  supabase: AdminClient,
  workspaceId: string,
  captureId: string,
  resourceId: string,
): Promise<void> {
  const { data: signalRows } = await supabase
    .from("pending_evidence_signals")
    .select("evidence_id")
    .eq("capture_id", captureId);
  const evidenceIds = (signalRows ?? []).map((r) => r.evidence_id as string);
  if (evidenceIds.length === 0) return;

  const { data: siblings } = await supabase
    .from("pending_evidence")
    .select("entity_type, created_record_id")
    .eq("workspace_id", workspaceId)
    .in("id", evidenceIds)
    .eq("status", "created")
    .not("created_record_id", "is", null);

  for (const sibling of siblings ?? []) {
    const targetType = sibling.entity_type === "file" ? "resource" : (sibling.entity_type as string);
    if (targetType !== "work" && targetType !== "billing") continue;
    const targetId = sibling.created_record_id as string;

    const { data: existing } = await supabase
      .from("entity_links")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source_type", "resource")
      .eq("source_id", resourceId)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from("entity_links").insert({
      workspace_id: workspaceId,
      source_type: "resource",
      source_id: resourceId,
      target_type: targetType,
      target_id: targetId,
      relation_type: "attachment",
      source: "system",
      because: "Attached to the same email",
    });
    if (error) {
      console.error("[email-attachment-ingest] sibling link failed:", error);
    }
  }
}

/**
 * Ingest every document-class attachment on a gmail capture into resources
 * with real bytes, then re-run content analysis on the document itself.
 * Idempotent: attachments already backed by storage bytes are skipped.
 * Never throws — ingestion must not fail capture processing.
 */
export async function ingestEmailAttachmentsForCapture(
  workspaceId: string,
  captureId: string,
): Promise<EmailAttachmentIngestResult> {
  const result: EmailAttachmentIngestResult = {
    attempted: 0,
    ingested: 0,
    skipped: 0,
    errors: [],
    resourceIds: [],
  };

  try {
    const supabase = createAdminClient();
    const { data: capture } = await supabase
      .from("capture_events")
      .select("id, workspace_id, source_type, source_external_id, extracted_data")
      .eq("id", captureId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!capture || capture.source_type !== "gmail" || !capture.source_external_id) {
      return result;
    }

    const extracted = (capture.extracted_data ?? {}) as Record<string, unknown>;
    const documents = readAttachments(extracted).filter(isDocumentClassAttachment);
    if (documents.length === 0) return result;

    const connection = await getConnectionStatusAdmin("gmail", workspaceId);
    if (!connection.connected || !connection.composioConnectionId) return result;

    const senderEmail =
      typeof extracted.sender_email === "string" ? extracted.sender_email : null;
    const snippet = typeof extracted.snippet === "string" ? extracted.snippet : null;

    // Lazily hydrated full message — only fetched when an attachmentId is
    // missing from the stored metadata (older captures, trigger payloads).
    let hydratedPayload: unknown = null;
    let hydrationAttempted = false;

    for (const document of documents) {
      result.attempted++;
      try {
        let attachmentId = document.attachmentId ?? null;
        if (!attachmentId && !hydrationAttempted) {
          hydrationAttempted = true;
          const message = (await getGmailMessage(
            capture.source_external_id,
            connection.composioConnectionId,
            workspaceId,
            { skipAuthCheck: true, workspaceId, unattended: true },
          )) as unknown as Record<string, unknown>;
          hydratedPayload = message.payload ?? (message.message as Record<string, unknown>)?.payload ?? null;
        }
        if (!attachmentId && hydratedPayload) {
          attachmentId = findAttachmentIdByName(hydratedPayload, document.name);
        }
        if (!attachmentId) {
          result.skipped++;
          result.errors.push(`${document.name}: no attachmentId`);
          continue;
        }

        // Skip when bytes already landed (idempotent re-runs).
        const existing = await findExistingResource(supabase, workspaceId, captureId, document.name);
        if (existing?.hasBytes) {
          result.skipped++;
          continue;
        }

        const download = await getGmailAttachment(
          {
            messageId: capture.source_external_id,
            attachmentId,
            fileName: document.name,
          },
          connection.composioConnectionId,
          workspaceId,
          { skipAuthCheck: true, workspaceId, unattended: true },
        );
        if (!download) {
          result.skipped++;
          result.errors.push(`${document.name}: download returned no file`);
          continue;
        }

        const bytes = await downloadBytes(download.s3url);
        if (!bytes) {
          result.skipped++;
          result.errors.push(`${document.name}: byte fetch failed or too large`);
          continue;
        }

        const mimeType = download.mimetype ?? document.contentType ?? null;
        const objectPath = `studio/${workspaceId}/email/${captureId}/${randomUUID()}-${sanitizeFileName(document.name)}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(objectPath, bytes, {
            contentType: mimeType ?? undefined,
            upsert: false,
          });
        if (uploadError) {
          result.errors.push(`${document.name}: storage upload failed: ${uploadError.message}`);
          continue;
        }

        let resourceId: string;
        if (existing) {
          const { error: updateError } = await supabase
            .from("resources")
            .update({
              bucket_id: STORAGE_BUCKET,
              object_path: objectPath,
              mime_type: mimeType,
              size_bytes: bytes.byteLength,
              // A metadata-only evidence birth is named after the email
              // subject — the attachment's real filename is ground truth.
              file_name: document.name,
            })
            .eq("id", existing.id)
            .eq("workspace_id", workspaceId);
          if (updateError) {
            result.errors.push(`${document.name}: resource update failed: ${updateError.message}`);
            continue;
          }
          resourceId = existing.id;
        } else {
          let personId: string | null = null;
          if (senderEmail) {
            const personIds = await findPersonIdsByEmail(supabase, workspaceId, senderEmail);
            personId = personIds[0] ?? null;
          }
          const { data: inserted, error: insertError } = await supabase
            .from("resources")
            .insert({
              workspace_id: workspaceId,
              file_name: document.name,
              source: "capture",
              created_by_system: true,
              capture_event_id: captureId,
              bucket_id: STORAGE_BUCKET,
              object_path: objectPath,
              mime_type: mimeType,
              size_bytes: bytes.byteLength,
              person_id: personId,
              extracted_data: snippet ? { source_excerpt: snippet } : undefined,
            })
            .select("id")
            .single();
          if (insertError || !inserted) {
            result.errors.push(`${document.name}: resource insert failed: ${insertError?.message ?? "unknown"}`);
            continue;
          }
          resourceId = inserted.id as string;
        }

        // Read the actual document (vision path for PDF bytes) — force so a
        // prior excerpt-only analysis is replaced by the real content.
        try {
          await analyzeResourceContent({ workspaceId, resourceId, force: true });
        } catch (analysisError) {
          console.error("[email-attachment-ingest] content analysis failed:", analysisError);
        }

        await linkCaptureSiblings(supabase, workspaceId, captureId, resourceId);

        result.ingested++;
        result.resourceIds.push(resourceId);
      } catch (attachmentError) {
        result.errors.push(
          `${document.name}: ${attachmentError instanceof Error ? attachmentError.message : String(attachmentError)}`,
        );
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}
