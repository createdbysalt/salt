import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { ServePreviewLayout } from "./ServePreviewLayout";

/**
 * Serve Mode - Canvas-Focused Portal Preview
 *
 * Design principles:
 * - Preview dominates the screen (Webflow-style)
 * - Minimal toolbar: client dropdown + device controls
 * - Works with zero clients (generic preview mode)
 * - No greeting header - this IS the content
 */
export default async function ServePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch clients for the dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, contact_email")
    .not("lifecycle_stage", "eq", "archived")
    .order("name")
    .limit(100);

  return <ServePreviewLayout clients={clients ?? []} />;
}
