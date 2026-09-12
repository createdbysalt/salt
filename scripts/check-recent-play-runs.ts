/**
 * One-off probe (2026-09-08): fetch a handful of recent gmail messages with
 * GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID (full message) and report the attachment
 * shape — attachmentList vs payload.parts[].body.attachmentId — so the
 * attachment-ingestion design reads the right field. Read-only.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/check-recent-play-runs.ts <workspace-id>
 */

import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { getGmailMessage } from "@/app/_lib/composio/actions";
import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: check-recent-play-runs.ts <workspace-id>");
  process.exit(1);
}

interface PartShape {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: PartShape[];
}

function collectAttachmentParts(part: PartShape | undefined, out: PartShape[] = []): PartShape[] {
  if (!part) return out;
  if (part.filename && part.body?.attachmentId) out.push(part);
  for (const child of part.parts ?? []) collectAttachmentParts(child, out);
  return out;
}

async function main() {
  const connection = await getConnectionStatusAdmin("gmail", workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    console.error("gmail not connected");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const { data: captures, error } = await supabase
    .from("capture_events")
    .select("id, source_external_id, extracted_data")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "gmail")
    .order("created_at", { ascending: false })
    .limit(15);
  if (error) throw error;

  let withAttachments = 0;
  for (const capture of captures ?? []) {
    if (!capture.source_external_id) continue;
    try {
      const message = (await getGmailMessage(
        capture.source_external_id,
        connection.composioConnectionId,
        workspaceId,
        { skipAuthCheck: true, workspaceId, unattended: true },
      )) as unknown as Record<string, unknown>;

      const subject = (capture.extracted_data as Record<string, unknown>)?.subject ?? "?";
      const parts = collectAttachmentParts(
        (message.payload ?? (message.message as Record<string, unknown>)?.payload) as PartShape | undefined,
      );
      const attachmentList = (message.attachmentList ?? (message.message as Record<string, unknown>)?.attachmentList) as unknown;

      if (parts.length > 0 || (Array.isArray(attachmentList) && attachmentList.length > 0)) {
        withAttachments++;
        console.log(`\n${subject}`);
        for (const part of parts) {
          console.log(`  part: ${part.filename} | ${part.mimeType} | ${part.body?.size ?? "?"} bytes | attachmentId=${part.body?.attachmentId?.slice(0, 12)}…`);
        }
        if (Array.isArray(attachmentList)) {
          console.log(`  attachmentList: ${JSON.stringify(attachmentList).slice(0, 300)}`);
        }
      } else {
        console.log(`(no attachments) ${subject}`);
      }
    } catch (fetchError) {
      console.warn(`fetch failed for ${capture.source_external_id}:`, fetchError instanceof Error ? fetchError.message : fetchError);
    }
  }
  console.log(`\nmessages with attachments: ${withAttachments}/${(captures ?? []).length}`);
}

main().catch((error) => {
  console.error("[probe] fatal:", error);
  process.exit(1);
});
