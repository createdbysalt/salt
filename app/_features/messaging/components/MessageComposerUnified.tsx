"use client";

import * as React from "react";
import {
  Send,
  Loader2,
  Paperclip,
  Mail,
  MessageSquare,
  ChevronDown,
  X,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { RichMarkdownEditor } from "./RichMarkdownEditor";
import type { MessageChannel } from "./ChannelBadge";
import type { BridgeStatus } from "./BridgeStatusBanner";

interface Attachment {
  id: string;
  name: string;
  size: number;
  file: File;
}

interface MessageComposerUnifiedProps {
  onSend: (content: string, channel: MessageChannel, attachments?: File[]) => Promise<{ error?: string } | void>;
  clientEmail?: string;
  bridgeStatus: BridgeStatus;
  gmailConnected?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onConnectGmail?: () => void;
}

const MAX_CHARS = 5000;
const CHAR_WARNING_THRESHOLD = 4500;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENTS = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageComposerUnified({
  onSend,
  clientEmail,
  bridgeStatus,
  gmailConnected = false,
  placeholder = "Type a message...",
  disabled = false,
  className,
  onConnectGmail,
}: MessageComposerUnifiedProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editorRef = React.useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);

  // Determine default channel based on Bridge status
  const getDefaultChannel = (): MessageChannel => {
    if (bridgeStatus === "active") return "bridge";
    return "email";
  };

  const [channel, setChannel] = React.useState<MessageChannel>(getDefaultChannel);

  // Update channel when bridge status changes
  React.useEffect(() => {
    setChannel(getDefaultChannel());
  }, [bridgeStatus]);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const showCharCount = charCount > CHAR_WARNING_THRESHOLD;
  const isEmpty = content.trim().length === 0;

  // Can only send email if Gmail is connected or client is on Bridge
  const canSendEmail = gmailConnected || bridgeStatus === "active";
  const canSend = !isEmpty && !isOverLimit && !isSending && !disabled &&
    (channel === "bridge" || canSendEmail);

  const handleSend = React.useCallback(async () => {
    if (!canSend) return;

    const messageContent = content.trim();
    setIsSending(true);

    try {
      const files = attachments.map((a) => a.file);
      const result = await onSend(messageContent, channel, files.length > 0 ? files : undefined);

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        setContent("");
        setAttachments([]);
        editorRef.current?.focus();
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [content, channel, attachments, canSend, onSend]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        if (attachments.length >= MAX_ATTACHMENTS) {
          toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
          break;
        }

        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          file,
        };

        setAttachments((prev) => [...prev, newAttachment]);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [attachments.length]
  );

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const channelDisabled = bridgeStatus !== "active";

  return (
    <TooltipProvider>
      <div className={cn("border-t bg-card", className)}>
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs"
              >
                <Paperclip className="size-3 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{attachment.name}</span>
                <span className="text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </span>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="p-4">
          <RichMarkdownEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            maxLength={MAX_CHARS + 500}
            className={cn(
              "min-h-[80px] max-h-[200px]",
              isOverLimit && "border-destructive focus-visible:border-destructive"
            )}
          />

          {/* Character count */}
          {showCharCount && (
            <div
              className={cn(
                "text-xs text-right mt-1",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </div>
          )}

          {/* Actions Row */}
          <div className="flex items-center justify-between mt-3">
            {/* Left: Attach */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                  >
                    <Paperclip className="size-4" />
                    Attach
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Attach files (max 10MB each)
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Right: Channel selector + Send */}
            <div className="flex items-center gap-2">
              {/* Channel Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={channelDisabled && !gmailConnected}
                  >
                    {channel === "bridge" ? (
                      <>
                        <MessageSquare className="size-4" />
                        Bridge
                      </>
                    ) : (
                      <>
                        <Mail className="size-4" />
                        Email
                      </>
                    )}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setChannel("bridge")}
                    disabled={bridgeStatus !== "active"}
                    className="gap-2"
                  >
                    <MessageSquare className="size-4" />
                    <div className="flex flex-col">
                      <span>Bridge</span>
                      {bridgeStatus !== "active" && (
                        <span className="text-xs text-muted-foreground">
                          Client not on Bridge
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setChannel("email")}
                    disabled={!gmailConnected}
                    className="gap-2"
                  >
                    <Mail className="size-4" />
                    <div className="flex flex-col">
                      <span>Email</span>
                      {clientEmail && (
                        <span className="text-xs text-muted-foreground">
                          {clientEmail}
                        </span>
                      )}
                      {!gmailConnected && (
                        <span className="text-xs text-muted-foreground">
                          Gmail not connected
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Gmail Connect Prompt */}
              {channel === "email" && !gmailConnected && onConnectGmail && (
                <Button variant="outline" size="sm" onClick={onConnectGmail}>
                  Connect Gmail
                </Button>
              )}

              {/* Send Button */}
              <Button
                onClick={handleSend}
                disabled={!canSend}
                size="sm"
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
