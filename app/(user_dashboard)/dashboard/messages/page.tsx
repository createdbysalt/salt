import { MessagesPageClient } from "./MessagesPageClient";
import { getStudioContext } from "@/libs/user-dashboard";
import { getConversations } from "@/app/actions/messaging/conversation-actions";
import { getStudioUnreadCounts } from "@/app/actions/messaging/unread-actions";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { userId, studio } = await getStudioContext();

  // Fetch conversations
  const conversationsResult = await getConversations();
  const conversations =
    "data" in conversationsResult ? conversationsResult.data : [];

  // Fetch unread counts
  const unreadResult = await getStudioUnreadCounts();
  const unreadCounts =
    "data" in unreadResult
      ? unreadResult.data
      : { total: 0, byConversation: {} };

  return (
    <MessagesPageClient
      conversations={conversations}
      unreadCounts={unreadCounts}
      currentUserId={userId}
      studioId={studio.id}
    />
  );
}
