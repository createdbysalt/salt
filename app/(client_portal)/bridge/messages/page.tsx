import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";
import {
  getClientConversations,
  getClientUnreadCounts,
  getMessageParticipants,
} from "@/app/_features/messaging/actions";
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

  // Run all server actions in parallel for better performance
  const [conversationsResult, unreadResult, participantsResult] = await Promise.all([
    getClientConversations(),
    getClientUnreadCounts(),
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
    <BridgeMessagesPageClient
      conversations={conversations}
      unreadCounts={unreadCounts}
      currentUserId={context.userId!}
      clientId={context.client.id}
      participants={participants}
    />
  );
}
