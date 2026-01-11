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

  const supabase = await createClient();

  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/bridge/login");
  }

  // Get conversation
  const conversationResult = await getConversationById(conversationId);

  if (!("data" in conversationResult)) {
    redirect("/messages");
  }

  const conversation = conversationResult.data as ClientConversation;

  // Get initial messages
  const messagesResult = await getMessages({ conversationId });
  const messagesData =
    "data" in messagesResult
      ? messagesResult.data
      : { messages: [], hasMore: false, nextCursor: null };

  // Mark messages as read
  await markMessagesAsRead({ conversationId });

  return (
    <BridgeConversationDetailClient
      conversation={conversation}
      initialMessages={messagesData.messages}
      initialHasMore={messagesData.hasMore}
      initialCursor={messagesData.nextCursor}
      currentUserId={user.id}
    />
  );
}
