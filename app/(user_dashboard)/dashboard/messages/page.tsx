import { MessagesPageClient } from "./MessagesPageClient";
import { getStudioContext } from "@/libs/user-dashboard";
import { getConversations, getStudioUnreadCounts } from "@/app/_features/messaging/actions";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { userId, studio } = await getStudioContext();

  // Run both queries in parallel for better performance
  const [conversationsResult, unreadResult] = await Promise.all([
    getConversations(),
    getStudioUnreadCounts()
  ]);

  const conversations =
    "data" in conversationsResult ? conversationsResult.data : [];
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
