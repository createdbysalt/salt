import { SidebarInset, SiteHeader } from "@repo/ui";
import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";
import {
  getClientConversations,
  type ClientConversation,
} from "@/app/actions/messaging/conversation-actions";
import { getClientUnreadCounts } from "@/app/actions/messaging/unread-actions";
import {
  getBridgeUserInfo,
  getBridgeStudioInfo,
  getBridgeProjects,
  getStudioIdFromClient,
} from "@/app/_lib/table/queries";
import { BridgeSidebar } from "../components/table-sidebar";
import { TableMessagesClient } from "./TableMessagesClient";

export const dynamic = "force-dynamic";

export default async function BridgeMessagesPage() {
  const { context } = await getTenantContext();

  // Require authentication
  if (!context.userId) {
    redirect("/table");
  }

  // Allow both client users and studio members
  if (context.actorType !== "clientUser" && context.actorType !== "studioMember") {
    redirect("/");
  }

  // For client users without client context, redirect to client selector
  if (context.actorType === "clientUser" && !context.client) {
    redirect("/table/select");
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

  // Fetch conversations and unread counts
  const [conversationsResult, unreadResult] = await Promise.all([
    getClientConversations(),
    getClientUnreadCounts(),
  ]);

  const conversations: ClientConversation[] =
    conversationsResult && "success" in conversationsResult && conversationsResult.success
      ? conversationsResult.data
      : [];

  const unreadCounts =
    unreadResult && "success" in unreadResult && unreadResult.success
      ? unreadResult.data
      : { total: 0, byConversation: {} };

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
        <TableMessagesClient
          initialConversations={conversations}
          initialUnreadCounts={unreadCounts}
        />
      </SidebarInset>
    </>
  );
}
