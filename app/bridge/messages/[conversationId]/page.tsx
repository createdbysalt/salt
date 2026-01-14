import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import {
  getConversationById,
  type ClientConversation,
} from "@/app/actions/messaging/conversation-actions";
import {
  getMessages,
  markMessagesAsRead,
} from "@/app/actions/messaging/message-actions";
import { BridgeConversationDetailClient } from "./BridgeConversationDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function BridgeConversationDetailPage({
  params,
}: PageProps) {
  const { conversationId } = await params;
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/bridge/login");
  }

  if (!context.client) {
    redirect("/bridge/select");
  }

  // Run queries in parallel for better performance
  const [conversationResult, messagesResult] = await Promise.all([
    getConversationById(conversationId),
    getMessages({ conversationId })
  ]);

  if (!("data" in conversationResult)) {
    redirect("/bridge/messages");
  }

  const conversation = conversationResult.data as ClientConversation;
  const messagesData =
    "data" in messagesResult
      ? messagesResult.data
      : { messages: [], hasMore: false, nextCursor: null };

  // Mark messages as read (can be done asynchronously)
  markMessagesAsRead({ conversationId });

  return (
    <BridgeConversationDetailClient
      conversation={conversation}
      initialMessages={messagesData.messages}
      initialHasMore={messagesData.hasMore}
      initialCursor={messagesData.nextCursor}
      currentUserId={context.userId!}
    />
  );
}
