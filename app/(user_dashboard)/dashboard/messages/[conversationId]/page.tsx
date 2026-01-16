import { redirect } from "next/navigation";
import { ConversationDetailClient } from "./ConversationDetailClient";
import { getStudioContext } from "@/libs/user-dashboard";
import {
  getConversationById,
  getMessages,
  markMessagesAsRead,
} from "@/app/_features/messaging/actions";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { userId } = await getStudioContext();

  // Fetch conversation
  const conversationResult = await getConversationById(conversationId);

  if (!("data" in conversationResult)) {
    redirect("/dashboard/messages");
  }

  const conversation = conversationResult.data;

  // Fetch initial messages
  const messagesResult = await getMessages({ conversationId });
  const messagesData =
    "data" in messagesResult
      ? messagesResult.data
      : { messages: [], nextCursor: null, hasMore: false };

  // Mark messages as read
  await markMessagesAsRead({ conversationId });

  return (
    <ConversationDetailClient
      conversation={conversation}
      initialMessages={messagesData.messages}
      initialHasMore={messagesData.hasMore}
      initialCursor={messagesData.nextCursor}
      currentUserId={userId}
    />
  );
}
