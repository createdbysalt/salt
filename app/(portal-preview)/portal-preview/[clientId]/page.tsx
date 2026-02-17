import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { BridgeOverview } from "@/app/_features/portal/components/overview/bridge-overview";
import { BridgeSurfaceProvider } from "@/app/_features/portal/components/bridge-surface-provider";
import {
  mergeBridgeOverviewConfig,
  getDefaultBridgeOverviewConfig
} from "@/app/_lib/bridge/overview-config";
import type { WidgetDataContext } from "@/app/_features/portal/types/bridge-overview";

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ clientId: string }>;
}

/**
 * Preview Page - Studio member preview of a client's portal
 *
 * This allows studio members to see exactly what a client sees
 * without needing to log in as that client.
 *
 * Rendered with BridgeSurfaceProvider for accurate light-mode preview.
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

  // Verify the client exists and belongs to a studio the user has access to
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, settings, studio_id")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    notFound();
  }

  // Verify user is a member of the client's studio
  const { data: membership } = await supabase
    .from("studio_members")
    .select("role")
    .eq("studio_id", client.studio_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    // User doesn't have access to this client's studio
    notFound();
  }

  // Fetch data as if we were the client
  const [
    { data: projects },
    { data: recentRequests },
    { data: recentFiles }
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description, status, updated_at, metadata")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false }),

    supabase
      .from("tasks")
      .select("id, title, status, created_at, updated_at")
      .eq("client_id", clientId)
      .eq("source", "client_request")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("project_files")
      .select("id, file_name, created_at, file_size")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(3)
  ]);

  // Get the client's name for the greeting
  const firstName = client.name?.split(" ")[0] || "Client";

  // Get Bridge Overview config from client settings
  const savedConfig = client?.settings?.bridge?.overview;
  const config = savedConfig
    ? mergeBridgeOverviewConfig(savedConfig)
    : getDefaultBridgeOverviewConfig();

  // Prepare stats
  const stats = {
    activeProjects: projects?.filter((p) => p.status === "active").length || 0,
    totalProjects: projects?.length || 0,
    pendingRequests:
      recentRequests?.filter(
        (r) => r.status === "open" || r.status === "in_progress"
      ).length || 0,
    completedThisMonth:
      recentRequests?.filter((r) => {
        const completedDate = new Date(r.updated_at);
        const now = new Date();
        return (
          r.status === "completed" &&
          completedDate.getMonth() === now.getMonth() &&
          completedDate.getFullYear() === now.getFullYear()
        );
      }).length || 0,
  };

  // Prepare widget data context
  const widgetData: WidgetDataContext = {
    clientName: client?.name || "Client",
    firstName,
    projects: projects || [],
    recentRequests: recentRequests || [],
    recentFiles: recentFiles || [],
    stats,
  };

  return (
    <BridgeSurfaceProvider>
      <div className="min-h-screen bg-background">
        {/* Preview Mode Banner */}
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm">
          <span className="text-primary font-medium">Preview Mode</span>
          <span className="text-muted-foreground ml-2">
            Viewing portal as {client.name}
          </span>
        </div>

        {/* Client Portal Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BridgeOverview config={config} data={widgetData} />
        </div>
      </div>
    </BridgeSurfaceProvider>
  );
}
