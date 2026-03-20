import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ clientId: string }>;
}

/**
 * Client Portal Preview - TEMPORARILY DISABLED
 *
 * This page is being rebuilt as part of the Bridge redesign.
 * Redirects to the client detail page for now.
 */
export default async function ClientPreviewPage({ params }: PreviewPageProps) {
  const { clientId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Redirect to client detail page with a message
  redirect(`/studio/clients/${clientId}?preview=coming-soon`);
}
