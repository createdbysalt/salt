import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { BridgeOverview } from "@/app/_features/portal/components/overview/bridge-overview";
import { BridgeSurfaceProvider } from "@/app/_features/portal/components/bridge-surface-provider";
import { getDefaultBridgeOverviewConfig } from "@/app/_lib/bridge/overview-config";
import type { WidgetDataContext } from "@/app/_features/portal/types/bridge-overview";

export const dynamic = "force-dynamic";

/**
 * Generic Preview Page - Portal preview without a specific client
 *
 * Shows what the portal looks like with sample/empty data.
 * Useful for:
 * - New users who haven't added clients yet
 * - Previewing branding/layout changes
 * - Testing before inviting real clients
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

  // Get studio for branding (if configured)
  const { data: studioMember } = await supabase
    .from("studio_members")
    .select("studio_id, studios(name, settings)")
    .eq("user_id", user.id)
    .single();

  // TypeScript: studios relation can return array, extract first item
  const studiosData = studioMember?.studios;
  const studio = Array.isArray(studiosData) ? studiosData[0] : studiosData;
  const studioName = studio?.name ?? "Your Studio";

  // Use default Bridge config
  const config = getDefaultBridgeOverviewConfig();

  // Sample data for preview
  const widgetData: WidgetDataContext = {
    clientName: "Sample Client",
    firstName: "Alex",
    projects: [
      {
        id: "sample-1",
        name: "Website Redesign",
        description: "Complete website overhaul with new branding",
        status: "active",
        updated_at: new Date().toISOString(),
        metadata: { progress: 65 },
      },
      {
        id: "sample-2",
        name: "Brand Identity",
        description: "Logo, colors, and brand guidelines",
        status: "completed",
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        metadata: { progress: 100 },
      },
    ],
    recentRequests: [
      {
        id: "req-1",
        title: "Add contact form to homepage",
        status: "in_progress",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "req-2",
        title: "Update footer links",
        status: "completed",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    recentFiles: [
      {
        id: "file-1",
        file_name: "brand-guidelines.pdf",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        file_size: 2400000,
      },
      {
        id: "file-2",
        file_name: "logo-final.svg",
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        file_size: 45000,
      },
    ],
    stats: {
      activeProjects: 1,
      totalProjects: 2,
      pendingRequests: 1,
      completedThisMonth: 3,
    },
  };

  return (
    <BridgeSurfaceProvider>
      <div className="min-h-screen bg-background">
        {/* Preview Mode Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm">
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Generic Preview
          </span>
          <span className="text-muted-foreground ml-2">
            Sample data shown • Your clients will see their own projects
          </span>
        </div>

        {/* Client Portal Content with Sample Data */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BridgeOverview config={config} data={widgetData} />
        </div>
      </div>
    </BridgeSurfaceProvider>
  );
}
