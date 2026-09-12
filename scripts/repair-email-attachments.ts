/**
 * One-off repair sweep (2026-09-08): historical gmail captures were backfilled
 * with verbose=false, which stripped attachment metadata — agreements and
 * contracts that arrived as email attachments never became resources with
 * readable bytes. This sweep hydrates each gmail capture's full message,
 * persists discovered attachment metadata onto the capture, and runs
 * email-attachment ingestion for document-class attachments (download →
 * bridge-files storage → resource with bytes → content analysis on the real
 * document → sibling links).
 *
 * Idempotent: captures whose attachments already have bytes are skipped by
 * the ingest service. Bounded by --limit and the Composio read gate
 * (600/hr/workspace).
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/repair-email-attachments.ts <workspace-id> [--limit 100] [--dry-run]
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { getGmailMessage } from "@/app/_lib/composio/actions";
import {
  ingestEmailAttachmentsForCapture,
  isDocumentClassAttachment,
  type EmailAttachmentMeta,
} from "@/app/_features/resources/services/email-attachment-ingest";

const workspaceId = process.argv[2];
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 100;
const dryRun = process.argv.includes("--dry-run");

if (!workspaceId) {
  console.error("usage: repair-email-attachments.ts <workspace-id> [--limit N] [--dry-run]");
  process.exit(1);
}

interface PartShape {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number };
  parts?: PartShape[];
}

function collectAttachments(root: unknown, out: EmailAttachmentMeta[] = []): EmailAttachmentMeta[] {
  const stack: PartShape[] = [root as PartShape];
  while (stack.length > 0) {
    const part = stack.pop();
    if (!part || typeof part !== "object") continue;
    if (part.filename && part.body?.attachmentId) {
      out.push({
        name: part.filename,
        contentType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
      });
    }
    for (const child of part.parts ?? []) stack.push(child);
  }
  return out;
}

async function main() {
  const supabase = createAdminClient();
  const connection = await getConnectionStatusAdmin("gmail", workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    console.error("[repair] gmail not connected");
    process.exit(1);
  }

  const { data: captures, error } = await supabase
    .from("capture_events")
    .select("id, source_external_id, extracted_data, created_at")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "gmail")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  console.log(`[repair] scanning ${(captures ?? []).length} gmail capture(s)${dryRun ? " (dry run)" : ""}`);

  let hydrated = 0;
  let withDocs = 0;
  let ingestedTotal = 0;
  const failures: string[] = [];

  for (const capture of captures ?? []) {
    if (!capture.source_external_id) continue;
    const extracted = (capture.extracted_data ?? {}) as Record<string, unknown>;
    const subject = String(extracted.subject ?? "(no subject)");

    // Already have document metadata? Skip hydration, ingest directly.
    let attachments = Array.isArray(extracted.attachments)
      ? (extracted.attachments as EmailAttachmentMeta[])
      : [];
    let docs = attachments.filter(isDocumentClassAttachment);

    if (docs.length === 0) {
      // Legacy row: hydrate the full message to discover attachments.
      try {
        const message = (await getGmailMessage(
          capture.source_external_id,
          connection.composioConnectionId!,
          workspaceId,
          { skipAuthCheck: true, workspaceId, unattended: true },
        )) as unknown as Record<string, unknown>;
        hydrated++;
        const payload = message.payload ?? (message.message as Record<string, unknown>)?.payload;
        attachments = collectAttachments(payload);
        docs = attachments.filter(isDocumentClassAttachment);
        if (attachments.length > 0 && !dryRun) {
          await supabase
            .from("capture_events")
            .update({
              extracted_data: {
                ...extracted,
                has_attachments: true,
                attachments,
              },
            })
            .eq("id", capture.id)
            .eq("workspace_id", workspaceId);
        }
      } catch (fetchError) {
        failures.push(`${capture.id}: ${fetchError instanceof Error ? fetchError.message : fetchError}`);
        continue;
      }
    }

    if (docs.length === 0) continue;
    withDocs++;
    console.log(`[repair] ${subject} — ${docs.map((d) => d.name).join(", ")}`);

    if (dryRun) continue;
    const result = await ingestEmailAttachmentsForCapture(workspaceId, capture.id as string);
    ingestedTotal += result.ingested;
    for (const err of result.errors) failures.push(`${capture.id}: ${err}`);
    if (result.ingested > 0) {
      console.log(`[repair]   → ingested ${result.ingested} (resources: ${result.resourceIds.join(", ")})`);
    }
  }

  console.log(
    `\n[repair] done: scanned=${(captures ?? []).length} hydrated=${hydrated} withDocs=${withDocs} ingested=${ingestedTotal} failures=${failures.length}`,
  );
  for (const failure of failures.slice(0, 10)) console.log(`  ✗ ${failure}`);
}

main().catch((error) => {
  console.error("[repair] fatal:", error);
  process.exit(1);
});
