import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import {
  getClientConversations,
  getClientUnreadCounts,
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

  // Run both server actions in parallel for better performance
  const [conversationsResult, unreadResult] = await Promise.all([
    getClientConversations(),
    getClientUnreadCounts()
  ]);

  const conversations =
    "data" in conversationsResult ? conversationsResult.data : [];
  const unreadCounts =
    "data" in unreadResult
      ? unreadResult.data
      : { total: 0, byConversation: {} };

  return (
    <BridgeMessagesPageClient
      conversations={conversations}
      unreadCounts={unreadCounts}
      currentUserId={context.userId!}
      clientId={context.client.id}
    />
  );
}
