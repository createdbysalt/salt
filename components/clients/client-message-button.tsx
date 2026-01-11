"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";
import { getOrCreateConversation } from "@/app/actions/messaging";
import { toast } from "sonner";

interface ClientMessageButtonProps {
  clientId: string;
  unreadCount: number;
  conversationId: string | null;
}

export function ClientMessageButton({
  clientId,
  unreadCount,
  conversationId,
}: ClientMessageButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);

    try {
      // If we already have a conversation, navigate directly
      if (conversationId) {
        router.push(`/dashboard/messages/${conversationId}`);
        return;
      }

      // Otherwise, create or get the conversation
      const result = await getOrCreateConversation(clientId);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // Navigate to the conversation
      router.push(`/dashboard/messages/${result.data.id}`);
    } catch (error) {
      toast.error("Failed to open conversation");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="relative"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4 mr-2" />
      )}
      Message
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
