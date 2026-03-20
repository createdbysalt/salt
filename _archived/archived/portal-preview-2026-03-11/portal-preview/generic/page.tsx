import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Generic Portal Preview - TEMPORARILY DISABLED
 *
 * This page is being rebuilt as part of the Bridge redesign.
 * Redirects to Serve settings for now.
 */
export default async function GenericPreviewPage() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Redirect to serve settings
  redirect("/settings/serve/brand?preview=coming-soon");
}
