import { MessagesPageClient } from "./MessagesPageClient";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import {
  getConversations,
  getStudioUnreadCounts,
  getMessageParticipants,
} from "@/app/_features/messaging/actions";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { userId, studio } = await getStudioContext();

  // Run all queries in parallel for better performance
  const [conversationsResult, unreadResult, participantsResult] = await Promise.all([
    getConversations(),
    getStudioUnreadCounts(),
    getMessageParticipants(),
  ]);

  const conversations =
    "data" in conversationsResult ? conversationsResult.data : [];
  const unreadCounts =
    "data" in unreadResult
      ? unreadResult.data
      : { total: 0, byConversation: {} };
  const participants =
    "data" in participantsResult ? participantsResult.data : [];

  return (
    <MessagesPageClient
      conversations={conversations}
      unreadCounts={unreadCounts}
      currentUserId={userId}
      studioId={studio.id}
      participants={participants}
    />
  );
}
