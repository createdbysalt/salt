import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";
import { BridgeOnboarding } from "@/app/_features/portal/components/bridge-onboarding";
import { BridgeOverview } from "@/app/_features/portal/components/overview/bridge-overview";
import { 
  mergeBridgeOverviewConfig,
  getDefaultBridgeOverviewConfig 
} from "@/libs/bridge/overview-config";
import type { WidgetDataContext } from "@/types/bridge-overview";

export const dynamic = "force-dynamic";

export default async function BridgeHome() {
  const { context } = await getTenantContext();
  
  if (!context.userId) {
    redirect("/bridge/login");
  }
  
  if (!context.client) {
    redirect("/bridge/select");
  }
  
  const supabase = await createClient();

  // Run all queries in parallel for better performance
  const [
    { data: { user } },
    { data: client },
    { data: projects },
    { data: recentRequests },
    { data: recentFiles }
  ] = await Promise.all([
    supabase.auth.getUser(),

    supabase
      .from("clients")
      .select("name, settings")
      .eq("id", context.client.id)
      .single(),

    supabase
      .from("projects")
      .select("id, name, description, status, updated_at, metadata")
      .eq("client_id", context.client.id)
      .order("updated_at", { ascending: false }),

    supabase
      .from("tasks")
      .select("id, title, status, created_at, updated_at")
      .eq("client_id", context.client.id)
      .eq("source", "client_request")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("project_files")
      .select("id, file_name, created_at, file_size")
      .eq("client_id", context.client.id)
      .order("created_at", { ascending: false })
      .limit(3)
  ]);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ||
                   user?.user_metadata?.name?.split(" ")[0] ||
                   user?.email?.split("@")[0] || "there";

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
    <>
      <BridgeOverview config={config} data={widgetData} />

      {/* Onboarding Widget */}
      <BridgeOnboarding />
    </>
  );
}
