// Supabase Edge Function: purge-deleted-clients
// Permanently deletes clients that have been in trash for more than 30 days.
// Triggered via cron schedule (service role JWT).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: clientsToPurge, error: fetchError } = await supabase
      .from("clients")
      .select("id, studio_id, deleted_at")
      .lt("deleted_at", thirtyDaysAgo.toISOString())
      .not("deleted_at", "is", null);

    if (fetchError) {
      console.error("Error fetching clients to purge:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch clients" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!clientsToPurge || clientsToPurge.length === 0) {
      return new Response(
        JSON.stringify({ message: "No clients to purge", purged: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .lt("deleted_at", thirtyDaysAgo.toISOString())
      .not("deleted_at", "is", null);

    if (deleteError) {
      console.error("Error purging clients:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to purge clients" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        message: "Purge completed successfully",
        purged: clientsToPurge.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
