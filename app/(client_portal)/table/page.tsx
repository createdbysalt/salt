import { headers } from "next/headers";
import { SidebarInset } from "@repo/ui";

import { getTenantContext } from "@/app/_lib/tenancy";
import {
  getStudioBrandingForLogin,
  getDefaultLoginBranding,
  getBridgeUserInfo,
  getBridgeStudioInfo,
  getBridgeProjects,
  getStudioIdFromClient,
  getBridgeOverviewData,
} from "@/app/_lib/table/queries";
import { BridgeSidebar } from "./components/table-sidebar";
import { BridgeLoginForm } from "./components/table-login-form";
import {
  GreetingHeader,
  TeamMessageCard,
  AttentionSection,
  ProjectsSection,
  ActivitySection,
} from "./_components";

export const dynamic = "force-dynamic";

export default async function BridgePage() {
  const { context } = await getTenantContext();

  // Show login form when not authenticated
  if (!context.userId) {
    // Get studio branding for custom domain, or use defaults
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const studioBranding =
      (await getStudioBrandingForLogin(host)) || getDefaultLoginBranding();

    return (
      <BridgeLoginForm
        studioName={studioBranding.studioName}
        supportEmail={studioBranding.supportEmail}
        branding={studioBranding.branding}
      />
    );
  }

  // Get user info for sidebar
  const userInfo = await getBridgeUserInfo(context.userId);

  // Get studio ID from context or client
  let studioId: string | null = null;
  if (context.actorType === "studioMember" && context.studio) {
    studioId = context.studio.id;
  } else if (context.client) {
    studioId = await getStudioIdFromClient(context.client.id);
  }

  // Get studio info and projects for sidebar
  const studioInfo = studioId
    ? await getBridgeStudioInfo(studioId)
    : { name: "Studio", logoUrl: null };

  const sidebarProjects = context.client
    ? await getBridgeProjects(context.client.id)
    : [];

  // Get overview data for the dashboard
  const overviewData = context.client
    ? await getBridgeOverviewData(context.client.id, context.userId)
    : {
        actionItems: [],
        projects: [],
        recentActivity: [],
        teamMessage: null,
        stats: { unreadMessages: 0, totalFiles: 0, outstandingBalance: 0, currency: "USD" },
      };

  // Authenticated: show overview with sidebar
  return (
    <>
      <BridgeSidebar
        variant="inset"
        user={userInfo}
        studio={studioInfo}
        projects={sidebarProjects}
        inboxUnreadCount={overviewData.stats.unreadMessages}
      />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Greeting */}
            <GreetingHeader firstName={userInfo.firstName || userInfo.name.split(" ")[0]} />

            {/* Team Message (if any) */}
            {overviewData.teamMessage && (
              <TeamMessageCard message={overviewData.teamMessage} />
            )}

            {/* Needs Attention */}
            <AttentionSection items={overviewData.actionItems} />

            {/* Two Column Layout: Projects + Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
              <ProjectsSection projects={overviewData.projects} />
              <ActivitySection items={overviewData.recentActivity} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
