/**
 * Diagnostic: can a stub Outlook capture be hydrated via Composio today?
 * Fetches one stub's message through the enrichment tool slug and prints
 * the shape of what comes back.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/test-outlook-hydration.ts
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";

async function main() {
  const s = createAdminClient();
  const { data: stubs } = await s
    .from("capture_events")
    .select("id, workspace_id, source_external_id")
    .eq("source_type", "outlook")
    .order("created_at", { ascending: false })
    .limit(50);
  const target = (stubs ?? []).find((c) => c.source_external_id);
  if (!target) {
    console.log("no stub with external id");
    return;
  }
  console.log("target capture:", target.id, "workspace:", target.workspace_id);

  const { data: conn, error: connError } = await s
    .from("workspace_integrations")
    .select("id, provider, composio_connection_id, composio_status, is_active")
    .eq("workspace_id", target.workspace_id)
    .limit(20);
  if (connError) {
    console.error("connection query error:", connError.message);
    return;
  }
  const outlook = (conn ?? []).find((c) => c.provider === "outlook");
  console.log(
    "connections:",
    (conn ?? [])
      .map((c) => `${c.provider}(${c.composio_status}${c.is_active ? "" : ",inactive"})`)
      .join(", ") || "none",
  );
  if (!outlook) {
    console.log("no outlook connection for this workspace");
    return;
  }
  const connectedAccountId = outlook.composio_connection_id;
  console.log("connectedAccountId present:", Boolean(connectedAccountId));
  if (!connectedAccountId) return;

  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const listMode = process.argv.includes("--list");
  const toolSlug = slugArg
    ? slugArg.split("=")[1]
    : COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_GET_MESSAGE;
  console.log("using tool slug:", toolSlug, listMode ? "(list mode)" : "");
  try {
    const result = await executeComposioAction(
      toolSlug,
      listMode
        ? {
            folder: "Inbox",
            top: 1,
            orderby: ["receivedDateTime desc"],
          }
        : { message_id: target.source_external_id, user_id: "me" },
      connectedAccountId,
      target.workspace_id,
      { skipAuthCheck: true, unattended: true, workspaceId: target.workspace_id },
    );
    const r = result as Record<string, unknown>;
    const unwrapped = (r.response_data ?? r.data ?? r) as Record<string, unknown>;
    console.log("FETCH OK — keys:", Object.keys(unwrapped).slice(0, 25).join(", "));
    console.log("subject:", JSON.stringify(unwrapped.subject)?.slice(0, 100));
    console.log(
      "hasAttachments:",
      JSON.stringify(unwrapped.hasAttachments ?? unwrapped.has_attachments),
    );
    const atts = unwrapped.attachments;
    console.log(
      "attachments:",
      Array.isArray(atts) ? JSON.stringify(atts).slice(0, 300) : String(atts),
    );
  } catch (e) {
    console.error("FETCH FAILED:", e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
