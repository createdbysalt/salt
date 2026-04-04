import { Suspense } from "react";
import { Skeleton } from "@repo/ui";
import { getConversations } from "@/app/actions/messaging/conversation-actions";
import { MessagesPageClient } from "./MessagesPageClient";

// Loading skeleton
function MessagesPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-5 w-px mx-2" />
        <Skeleton className="h-7 w-32" />
        <div className="flex-1" />
        <Skeleton className="size-8 rounded-md" />
      </header>

      {/* Main content skeleton */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar skeleton */}
        <div className="w-[300px] shrink-0 border-r flex flex-col">
          <div className="h-[60px] flex items-center px-4 border-b">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="size-16 rounded-full mx-auto" />
            <Skeleton className="h-5 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function MessagesPageContent() {
  // Fetch all conversations for the studio
  const conversationsResult = await getConversations();

  const conversations = "error" in conversationsResult ? [] : conversationsResult.data;

  // TODO: Fetch Gmail connection status
  const gmailConnected = false;
  const gmailAccount = undefined;

  return (
    <MessagesPageClient
      initialConversations={conversations}
      gmailConnected={gmailConnected}
      gmailAccount={gmailAccount}
    />
  );
}

export default function ClientsMessagesPage() {
  return (
    <Suspense fallback={<MessagesPageSkeleton />}>
      <MessagesPageContent />
    </Suspense>
  );
}
