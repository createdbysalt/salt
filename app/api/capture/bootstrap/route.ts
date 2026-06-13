import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import { runGmailBootstrap } from "@/app/_features/capture/services/gmail-ingestion";
import { getConnectionStatus } from "@/app/_lib/composio/connections";

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
      const result = await runGmailBootstrap(workspaceId);
      return NextResponse.json({
        success: result.success,
        capturesCreated: result.capturesCreated,
        contactsDiscovered: result.contactsDiscovered,
        error: result.error,
        connection: {
          connected: connection.connected,
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
