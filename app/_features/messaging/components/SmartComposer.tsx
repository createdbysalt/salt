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
  Link as LinkIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Textarea,
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
import { EmailFields, type GmailAccount, type EmailRecipient } from "./EmailFields";

// ============================================================================
// Types
// ============================================================================

export type MessageMode = "message" | "email";

export interface ContactCapabilities {
  hasBridge: boolean;
  hasEmail: boolean;
  email?: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  file: File;
}

type BlockingReason = "no_gmail" | "no_bridge" | "no_email" | null;

interface SmartComposerProps {
  // Mode & capabilities
  conversationType: "general" | "direct";
  contact?: ContactCapabilities;
  contacts?: (ContactCapabilities & { id: string; name: string })[];
  gmailConnected: boolean;
  gmailAccounts?: GmailAccount[];

  // Callbacks
  onSend: (data: {
    content: string;
    mode: MessageMode;
    attachments?: File[];
    emailData?: {
      fromAccountId: string;
      recipientIds: string[];
      subject: string;
    };
  }) => Promise<{ error?: string } | void>;
  onConnectGmail?: () => void;
  onInviteToBridge?: () => void;
  onAddEmail?: () => void;

  // Display
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_CHARS = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENTS = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// Smart Default Logic
// ============================================================================

function getDefaultMode(
  conversationType: "general" | "direct",
  contact: ContactCapabilities | undefined,
  contacts: (ContactCapabilities & { id: string; name: string })[] | undefined,
  gmailConnected: boolean
): MessageMode {
  if (conversationType === "direct") {
    if (contact?.hasBridge) return "message";
    if (contact?.hasEmail && gmailConnected) return "email";
    // Default to message even if not available - we'll show dialog on send
    return "message";
  }

  // General channel
  const hasAnyBridgeUsers = contacts?.some((c) => c.hasBridge) ?? false;
  if (hasAnyBridgeUsers) return "message";
  if (gmailConnected) return "email";
  return "message";
}

function getAvailableModes(
  conversationType: "general" | "direct",
  contact: ContactCapabilities | undefined,
  contacts: (ContactCapabilities & { id: string; name: string })[] | undefined,
  gmailConnected: boolean
): { message: boolean; email: boolean; hasEmailAddress: boolean } {
  if (conversationType === "direct") {
    const hasEmailAddress = contact?.hasEmail ?? false;
    return {
      message: contact?.hasBridge ?? false,
      email: hasEmailAddress && gmailConnected,
      hasEmailAddress,
    };
  }

  // General channel
  const hasAnyEmailAddress = contacts?.some((c) => c.hasEmail) ?? false;
  return {
    message: contacts?.some((c) => c.hasBridge) ?? false,
    email: gmailConnected && hasAnyEmailAddress,
    hasEmailAddress: hasAnyEmailAddress,
  };
}

function getBlockingReason(
  mode: MessageMode,
  availableModes: { message: boolean; email: boolean; hasEmailAddress: boolean },
  gmailConnected: boolean
): BlockingReason {
  if (mode === "message" && !availableModes.message) {
    return "no_bridge";
  }
  if (mode === "email") {
    if (!gmailConnected) return "no_gmail";
    if (!availableModes.hasEmailAddress) return "no_email";
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export function SmartComposer({
  conversationType,
  contact,
  contacts,
  gmailConnected,
  gmailAccounts = [],
  onSend,
  onConnectGmail,
  onInviteToBridge,
  onAddEmail,
  placeholder,
  disabled = false,
  className,
}: SmartComposerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Content state
  const [content, setContent] = React.useState("");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [isSending, setIsSending] = React.useState(false);

  // Email fields state
  const [selectedFromId, setSelectedFromId] = React.useState(
    gmailAccounts[0]?.id ?? ""
  );
  const [subject, setSubject] = React.useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = React.useState<string[]>([]);

  // Dialog state
  const [showBlockingDialog, setShowBlockingDialog] = React.useState(false);
  const [blockingReason, setBlockingReason] = React.useState<BlockingReason>(null);

  // Mode state
  const availableModes = getAvailableModes(conversationType, contact, contacts, gmailConnected);
  const defaultMode = getDefaultMode(conversationType, contact, contacts, gmailConnected);
  const [mode, setMode] = React.useState<MessageMode>(defaultMode);

  // Update mode when capabilities change
  React.useEffect(() => {
    const newDefaultMode = getDefaultMode(conversationType, contact, contacts, gmailConnected);
    setMode(newDefaultMode);
  }, [conversationType, contact, contacts, gmailConnected]);

  // Build recipients list for email fields
  const emailRecipients: EmailRecipient[] = React.useMemo(() => {
    if (conversationType === "direct" && contact?.email) {
      return [{ id: "contact", name: "Contact", email: contact.email }];
    }
    return (
      contacts
        ?.filter((c) => c.hasEmail && c.email)
        .map((c) => ({ id: c.id, name: c.name, email: c.email! })) ?? []
    );
  }, [conversationType, contact, contacts]);

  // Auto-select single recipient in DM
  React.useEffect(() => {
    if (conversationType === "direct" && emailRecipients.length === 1) {
      setSelectedRecipientIds([emailRecipients[0].id]);
    }
  }, [conversationType, emailRecipients]);

  // Validation
  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = content.trim().length === 0;
  const hasValidRecipients = mode === "message" || selectedRecipientIds.length > 0;

  // Check if we can actually send (ignoring capability blocks - those show dialog)
  const hasContentToSend = !isEmpty && !isOverLimit && !isSending && !disabled && hasValidRecipients;

  // Handlers
  const handleSend = React.useCallback(async () => {
    if (!hasContentToSend) return;

    // Check if there's a blocking reason
    const reason = getBlockingReason(mode, availableModes, gmailConnected);
    if (reason) {
      setBlockingReason(reason);
      setShowBlockingDialog(true);
      return;
    }

    setIsSending(true);

    try {
      const result = await onSend({
        content: content.trim(),
        mode,
        attachments: attachments.length > 0 ? attachments.map((a) => a.file) : undefined,
        emailData:
          mode === "email"
            ? {
                fromAccountId: selectedFromId,
                recipientIds: selectedRecipientIds,
                subject,
              }
            : undefined,
      });

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        setContent("");
        setAttachments([]);
        setSubject("");
        textareaRef.current?.focus();
      }
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [hasContentToSend, mode, availableModes, gmailConnected, content, attachments, selectedFromId, selectedRecipientIds, subject, onSend]);

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

        setAttachments((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name: file.name, size: file.size, file },
        ]);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [attachments.length]
  );

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDialogAction = () => {
    setShowBlockingDialog(false);
    if (blockingReason === "no_gmail" && onConnectGmail) {
      onConnectGmail();
    } else if (blockingReason === "no_bridge" && onInviteToBridge) {
      onInviteToBridge();
    } else if (blockingReason === "no_email" && onAddEmail) {
      onAddEmail();
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const showEmailFields = mode === "email" && gmailConnected;
  const showRecipientPicker = conversationType === "general" && mode === "email";

  return (
    <TooltipProvider>
      <div className={cn("border-t bg-card", className)}>
        {/* Email Fields (conditional) */}
        {showEmailFields && (
          <EmailFields
            fromAccounts={gmailAccounts}
            selectedFromId={selectedFromId}
            onFromChange={setSelectedFromId}
            recipients={emailRecipients}
            selectedRecipientIds={selectedRecipientIds}
            onRecipientsChange={setSelectedRecipientIds}
            subject={subject}
            onSubjectChange={setSubject}
            showRecipientPicker={showRecipientPicker}
          />
        )}

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
        <div className="px-4 py-3">
          {/* Mode indicator - subtle pill above input */}
          <div className="flex items-center gap-2 mb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    mode === "email"
                      ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {mode === "email" ? (
                    <Mail className="size-3" />
                  ) : (
                    <MessageSquare className="size-3" />
                  )}
                  {mode === "email" ? "Email" : "Bridge"}
                  <ChevronDown className="size-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem
                  onClick={() => setMode("message")}
                  className="gap-3 py-2.5"
                >
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="size-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Bridge Message</span>
                    <span className="text-xs text-muted-foreground">
                      {availableModes.message
                        ? "Real-time messaging in their portal"
                        : "Not on Bridge yet"}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setMode("email")}
                  className="gap-3 py-2.5"
                >
                  <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Mail className="size-4 text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Email</span>
                    <span className="text-xs text-muted-foreground">
                      {availableModes.email
                        ? contact?.email ?? "Send to their inbox"
                        : !gmailConnected
                          ? "Connect Gmail to send"
                          : "No email on file"}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Input card */}
          <div className="rounded-xl border bg-background shadow-sm">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                placeholder ??
                (mode === "email" ? "Write your email..." : "Type a message...")
              }
              disabled={disabled || isSending}
              className={cn(
                "min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 text-sm",
                isOverLimit && "text-destructive"
              )}
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 pb-2">
              {/* Left: Actions */}
              <div className="flex items-center gap-0.5">
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
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachments.length >= MAX_ATTACHMENTS}
                    >
                      <Paperclip className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach files</TooltipContent>
                </Tooltip>
              </div>

              {/* Right: Send */}
              <Button
                onClick={handleSend}
                disabled={!hasContentToSend}
                size="sm"
                className={cn(
                  "h-7 px-3 gap-1.5 rounded-lg transition-all",
                  hasContentToSend && !isEmpty
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isSending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                <span className="text-xs font-medium">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Blocking Dialog */}
      <AlertDialog open={showBlockingDialog} onOpenChange={setShowBlockingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockingReason === "no_gmail" && "Connect Gmail to send emails"}
              {blockingReason === "no_bridge" && "Invite to Bridge first"}
              {blockingReason === "no_email" && "No email address"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockingReason === "no_gmail" && (
                <>
                  To send emails from Salt Core, you need to connect your Gmail account.
                  This allows you to send and receive emails directly in your conversations.
                </>
              )}
              {blockingReason === "no_bridge" && (
                <>
                  This contact isn&apos;t on Bridge yet. Invite them to Bridge for real-time
                  messaging, or switch to Email mode to send them an email instead.
                </>
              )}
              {blockingReason === "no_email" && (
                <>
                  This contact doesn&apos;t have an email address on file. Add their email
                  to send them messages via email.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDialogAction}>
              {blockingReason === "no_gmail" && (
                <>
                  <Mail className="size-4" />
                  Connect Gmail
                </>
              )}
              {blockingReason === "no_bridge" && (
                <>
                  <LinkIcon className="size-4" />
                  Invite to Bridge
                </>
              )}
              {blockingReason === "no_email" && (
                <>
                  <Mail className="size-4" />
                  Add Email
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
