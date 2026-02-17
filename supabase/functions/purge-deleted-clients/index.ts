// Supabase Edge Function: purge-deleted-clients
// Permanently deletes clients that have been in trash for more than 30 days.
// Triggered via cron schedule.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify this is a cron invocation or authorized request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find clients deleted more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get clients to be purged (for logging)
    const { data: clientsToPurge, error: fetchError } = await supabase
      .from("clients")
      .select("id, name, studio_id, deleted_at")
      .lt("deleted_at", thirtyDaysAgo.toISOString())
      .not("deleted_at", "is", null);

    if (fetchError) {
      console.error("Error fetching clients to purge:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch clients", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clientsToPurge || clientsToPurge.length === 0) {
      console.log("No clients to purge");
      return new Response(
        JSON.stringify({ message: "No clients to purge", purged: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${clientsToPurge.length} client(s) to purge:`,
      clientsToPurge.map(c => ({ id: c.id, name: c.name, deleted_at: c.deleted_at }))
    );

    // Delete the clients (cascades to related tables via FK constraints)
    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .lt("deleted_at", thirtyDaysAgo.toISOString())
      .not("deleted_at", "is", null);

    if (deleteError) {
      console.error("Error purging clients:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to purge clients", details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully purged ${clientsToPurge.length} client(s)`);

    return new Response(
      JSON.stringify({
        message: "Purge completed successfully",
        purged: clientsToPurge.length,
        clients: clientsToPurge.map(c => ({ id: c.id, name: c.name }))
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
