import { redirect } from "next/navigation";
import { SidebarInset } from "@repo/ui";
import { getTenantContext } from "@/app/_lib/tenancy";
import { BridgeSidebar } from "../components/table-sidebar";
import { BridgeHeader } from "../components/table-header";
import {
  getStudioIdFromClient,
  getBridgeStudioInfo,
  getBridgeProjects,
  getBridgeUserInfo,
} from "@/app/_lib/table/queries";
import { getBridgeUnreadCount } from "@/app/_features/inbox/table-queries";

export const dynamic = "force-dynamic";

/**
 * Bridge Inbox Layout
 *
 * Wraps the inbox page with the Bridge shell (sidebar + header).
 * Provides the same navigation structure as other Bridge pages.
 */
export default async function BridgeInboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context } = await getTenantContext();

  // Ensure user is authenticated with client context
  if (!context.userId) {
    redirect("/table/login");
  }

  if (context.actorType !== "clientUser" || !context.client) {
    redirect("/table/select");
  }

  // Get studio info for branding
  const studioId = await getStudioIdFromClient(context.client.id);

  // Fetch data in parallel
  const [userInfo, studioInfo, projects, unreadCount] = await Promise.all([
    getBridgeUserInfo(context.userId),
    studioId ? getBridgeStudioInfo(studioId) : Promise.resolve({ name: "Studio", logoUrl: null }),
    getBridgeProjects(context.client.id),
    getBridgeUnreadCount(context.client.id),
  ]);

  const projectItems = projects.map((p) => ({
    id: p.id,
    name: p.name,
    url: `/table/projects/${p.id}`,
  }));

  return (
    <>
      <BridgeSidebar
        user={userInfo}
        studio={studioInfo}
        projects={projectItems}
        inboxUnreadCount={unreadCount}
      />
      <SidebarInset>
        <BridgeHeader title="Inbox" />
        <div className="flex-1 overflow-hidden">{children}</div>
      </SidebarInset>
    </>
  );
}
