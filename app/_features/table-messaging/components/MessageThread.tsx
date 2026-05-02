"use client";

import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage, Button, Separator, Skeleton } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import type { ClientConversation } from "@/app/actions/messaging/conversation-actions";
import type { Message } from "@/app/actions/messaging/message-actions";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

interface MessageThreadProps {
  conversation: ClientConversation;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (content: string) => void;
  onBack: () => void;
}

export function MessageThread({
  conversation,
  messages,
  isLoading,
  isSending,
  onSendMessage,
  onBack,
}: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get initials from studio name
  const initials = conversation.studioName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Format date for separator
  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  // Group messages by date
  const messagesWithSeparators: Array<{ type: "date"; date: Date } | { type: "message"; message: Message }> = [];
  let lastDate: Date | null = null;

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt);
    if (!lastDate || !isSameDay(lastDate, messageDate)) {
      messagesWithSeparators.push({ type: "date", date: messageDate });
      lastDate = messageDate;
    }
    messagesWithSeparators.push({ type: "message", message });
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden shrink-0"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <Avatar className="size-10">
          {conversation.studioLogoUrl && (
            <AvatarImage src={conversation.studioLogoUrl} alt={conversation.studioName} />
          )}
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-medium truncate">{conversation.studioName}</h2>
          <p className="text-sm text-muted-foreground">Direct message</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {isLoading ? (
            // Loading skeleton
            <>
              <div className="flex items-end gap-2 max-w-[60%]">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-16 w-48 rounded-2xl rounded-bl-sm" />
              </div>
              <div className="flex items-end gap-2 max-w-[60%] ml-auto flex-row-reverse">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-12 w-36 rounded-2xl rounded-br-sm" />
              </div>
              <div className="flex items-end gap-2 max-w-[60%]">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-20 w-56 rounded-2xl rounded-bl-sm" />
              </div>
            </>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                No messages yet. Send a message to start the conversation.
              </p>
            </div>
          ) : (
            messagesWithSeparators.map((item, index) => {
              if (item.type === "date") {
                return (
                  <div key={`date-${index}`} className="flex items-center gap-4 py-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {formatDateSeparator(item.date)}
                    </span>
                    <Separator className="flex-1" />
                  </div>
                );
              }

              return (
                <MessageBubble
                  key={item.message.id}
                  message={item.message}
                  isOwnMessage={item.message.senderType === "client_user"}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Composer */}
      <MessageComposer onSend={onSendMessage} isSending={isSending} />
    </div>
  );
}
