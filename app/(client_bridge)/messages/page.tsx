import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { getClientConversations } from "@/app/actions/messaging/conversation-actions";
import { getClientUnreadCounts } from "@/app/actions/messaging/unread-actions";
import { BridgeMessagesPageClient } from "./BridgeMessagesPageClient";

export const dynamic = "force-dynamic";

export default async function BridgeMessagesPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/bridge/login");
  }

  if (!context.client) {
    redirect("/bridge/select");
  }

  const supabase = await createClient();

  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/bridge/login");
  }

  // Get conversations for this client
  const conversationsResult = await getClientConversations();
  const conversations =
    "data" in conversationsResult ? conversationsResult.data : [];

  // Get unread counts
  const unreadResult = await getClientUnreadCounts();
  const unreadCounts =
    "data" in unreadResult
      ? unreadResult.data
      : { total: 0, byConversation: {} };

  return (
    <BridgeMessagesPageClient
      conversations={conversations}
      unreadCounts={unreadCounts}
      currentUserId={user.id}
      clientId={context.client.id}
    />
  );
}
