import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import { runGmailBootstrap, backfillGmailCaptures } from "@/app/_features/capture/services/gmail-backfill";
import { getConnectionStatus } from "@/app/_lib/composio/connections";

/**
 * Debug: check what's in the database
 * GET /api/capture/bootstrap
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  const { data: captures, error } = await supabase
    .from("capture_events")
    .select("id, title, source_type, state, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    workspaceId: membership.workspace_id,
    captureCount: captures?.length ?? 0,
    captures: captures ?? [],
    error: error?.message,
  });
}

/**
 * Manual bootstrap trigger for testing.
 * POST /api/capture/bootstrap?provider=gmail
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const provider = request.nextUrl.searchParams.get("provider") || "gmail";
  const scope = request.nextUrl.searchParams.get("scope") || "bootstrap";
  const workspaceId = membership.workspace_id;

  console.log(`[capture-bootstrap] Manual trigger for ${provider} in workspace ${workspaceId}`);

  // Check connection status first
  const connection = await getConnectionStatus(provider as "gmail", workspaceId);
  console.log(`[capture-bootstrap] Connection status:`, connection);

  // Return early if not connected
  if (!connection.connected) {
    return NextResponse.json({
      error: "Provider not connected",
      connection: {
        connected: connection.connected,
        hasConnectionId: !!connection.composioConnectionId,
        composioStatus: connection.composioStatus,
      },
    }, { status: 400 });
  }

  try {
    if (provider === "gmail") {
      const result =
        scope === "sync"
          ? await backfillGmailCaptures(workspaceId, {
              lookbackDays: 7,
              maxMessagesPerQuery: 200,
              includeSent: true,
              includeInbox: true,
            })
          : await runGmailBootstrap(workspaceId);
      return NextResponse.json({
        success: result.success,
        capturesCreated: result.capturesCreated,
        contactsDiscovered: result.contactsDiscovered,
        error: result.error,
        debug: result.debug,
        connection: {
          connected: connection.connected,
          integrationId: connection.integrationId,
          composioConnectionId: connection.composioConnectionId,
          email: connection.email,
        },
      });
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (error) {
    console.error(`[capture-bootstrap] Error:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Bootstrap failed",
        connection: {
          connected: connection.connected,
          composioConnectionId: connection.composioConnectionId,
        },
      },
      { status: 500 }
    );
  }
}
