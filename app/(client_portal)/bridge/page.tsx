import { headers } from "next/headers";
import {
  ChartAreaInteractive,
  DataTable,
  SectionCards,
  SiteHeader,
  SidebarInset,
} from "@repo/ui";

import { getTenantContext } from "@/app/_lib/tenancy";
import {
  getStudioBrandingForLogin,
  getDefaultLoginBranding,
  getBridgeUserInfo,
  getBridgeStudioInfo,
  getBridgeProjects,
  getStudioIdFromClient,
} from "@/app/_lib/bridge/queries";
import { BridgeSidebar } from "./components/bridge-sidebar";
import { BridgeLoginForm } from "./components/bridge-login-form";
import data from "./data.json";

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

  // Get studio info and projects
  const studioInfo = studioId
    ? await getBridgeStudioInfo(studioId)
    : { name: "Studio", logoUrl: null };

  const projects = context.client
    ? await getBridgeProjects(context.client.id)
    : [];

  // Authenticated: show dashboard with sidebar
  return (
    <>
      <BridgeSidebar
        variant="inset"
        user={userInfo}
        studio={studioInfo}
        projects={projects}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
