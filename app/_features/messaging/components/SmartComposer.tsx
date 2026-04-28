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
  FolderOpen,
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
import { ClientFilePicker } from "./ClientFilePicker";

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
  /** If this file came from the Files tab, its ID (to avoid duplication) */
  existingFileId?: string;
}

type BlockingReason = "no_gmail" | "no_bridge" | "no_email" | null;

export interface ReplyContext {
  /** Subject of the email thread being replied to */
  subject: string;
  /** Gmail thread ID for threading */
  threadId?: string;
}

export interface EmailThread {
  /** Gmail thread ID */
  threadId: string;
  /** Thread subject */
  subject: string;
  /** Last message date */
  lastMessageAt: Date;
}

interface SmartComposerProps {
  // Mode & capabilities
  conversationType: "general" | "direct";
  contact?: ContactCapabilities;
  contacts?: (ContactCapabilities & { id: string; name: string })[];
  gmailConnected: boolean;
  gmailAccounts?: GmailAccount[];

  // Client context for file picker
  clientId?: string;

  // Reply context for continuing email threads (deprecated - use availableThreads)
  replyContext?: ReplyContext;
  // Available email threads to reply to (last 7 days)
  availableThreads?: EmailThread[];

  // Callbacks
  onSend: (data: {
    content: string;
    mode: MessageMode;
    attachments?: Array<{ file: File; existingFileId?: string }>;
    emailData?: {
      fromAccountId: string;
      recipientIds: string[];
      subject: string;
      /** Thread ID when replying to existing thread */
      replyToThreadId?: string;
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
    // Check contact first, then fall back to contacts array (matches emailRecipients logic)
    const hasEmailAddress = contact?.hasEmail ?? contacts?.some((c) => c.hasEmail) ?? false;
    const hasBridge = contact?.hasBridge ?? false;
    return {
      message: hasBridge,
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
  clientId,
  replyContext,
  availableThreads = [],
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

  // Email compose type: "new" for new email, "reply" for replying to thread
  const [composeType, setComposeType] = React.useState<"new" | "reply">(
    availableThreads.length > 0 ? "reply" : "new"
  );
  const [selectedThreadId, setSelectedThreadId] = React.useState<string>(
    availableThreads[0]?.threadId ?? ""
  );

  // Update compose type and selected thread when availableThreads changes
  React.useEffect(() => {
    if (availableThreads.length > 0) {
      setComposeType("reply");
      setSelectedThreadId(availableThreads[0].threadId);
    } else {
      setComposeType("new");
      setSelectedThreadId("");
    }
  }, [availableThreads]);

  // Get selected thread details
  const selectedThread = availableThreads.find((t) => t.threadId === selectedThreadId);

  // Email fields state
  const [selectedFromId, setSelectedFromId] = React.useState(
    gmailAccounts[0]?.id ?? ""
  );
  // Initialize subject based on compose type
  const getReplySubject = (originalSubject: string) => {
    // Don't add "Re:" if it already starts with "Re:"
    if (originalSubject.toLowerCase().startsWith("re:")) {
      return originalSubject;
    }
    return `Re: ${originalSubject}`;
  };
  const [subject, setSubject] = React.useState(() => {
    if (availableThreads.length > 0 && availableThreads[0].subject) {
      return getReplySubject(availableThreads[0].subject);
    }
    if (replyContext?.subject) {
      return getReplySubject(replyContext.subject);
    }
    return "";
  });
  const [selectedRecipientIds, setSelectedRecipientIds] = React.useState<string[]>([]);

  // Update subject when compose type or selected thread changes
  React.useEffect(() => {
    if (composeType === "reply" && selectedThread) {
      setSubject(getReplySubject(selectedThread.subject));
    } else if (composeType === "new") {
      setSubject("");
    }
  }, [composeType, selectedThread]);

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
      // Find the matching contact from contacts array to get the actual ID
      const matchingContact = contacts?.find((c) => c.email === contact.email);
      if (matchingContact) {
        return [{ id: matchingContact.id, name: matchingContact.name, email: matchingContact.email! }];
      }
      // Fallback if no match found in contacts array
      return [{ id: "primary", name: "Contact", email: contact.email }];
    }
    return (
      contacts
        ?.filter((c) => c.hasEmail && c.email)
        .map((c) => ({ id: c.id, name: c.name, email: c.email! })) ?? []
    );
  }, [conversationType, contact, contacts]);

  // Auto-select recipients based on conversation type
  React.useEffect(() => {
    if (conversationType === "direct" && emailRecipients.length === 1) {
      // DM: auto-select the single recipient
      setSelectedRecipientIds([emailRecipients[0].id]);
    } else if (conversationType === "general" && emailRecipients.length > 0) {
      // General: auto-select ALL recipients (group email)
      setSelectedRecipientIds(emailRecipients.map((r) => r.id));
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
        attachments: attachments.length > 0 ? attachments.map((a) => ({ file: a.file, existingFileId: a.existingFileId })) : undefined,
        emailData:
          mode === "email"
            ? {
                fromAccountId: selectedFromId,
                recipientIds: selectedRecipientIds,
                subject,
                // Include thread ID when replying to existing thread
                replyToThreadId: composeType === "reply" ? selectedThreadId : undefined,
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
      if (e.key === "Enter") {
        if (mode === "email") {
          // Email mode: Cmd/Ctrl+Enter to send, Enter for new line
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleSend();
          }
          // Otherwise let Enter create a new line (default behavior)
        } else {
          // Message mode: Enter to send, Shift+Enter for new line
          if (!e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }
      }
    },
    [handleSend, mode]
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

  const showEmailFields = mode === "email";
  // In General channel, we don't show recipient picker - emails go to everyone
  const showRecipientPicker = false;
  const isGroupEmail = conversationType === "general" && mode === "email";

  return (
    <TooltipProvider>
      <div className={cn("border-t bg-background", className)}>
        {/* Composer Card - unified container */}
        <div className="p-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            {/* Email Fields (inside card) */}
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
                isGroupEmail={isGroupEmail}
                isReply={composeType === "reply"}
                // Thread selection props
                availableThreads={availableThreads}
                isReplyMode={composeType === "reply"}
                onReplyModeChange={(isReply) => setComposeType(isReply ? "reply" : "new")}
                selectedThreadId={selectedThreadId}
                onThreadChange={setSelectedThreadId}
              />
            )}

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className={cn(
                "flex flex-wrap gap-2 px-4 py-3",
                showEmailFields ? "border-t" : ""
              )}>
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

            {/* Message Input */}
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
                "min-h-[100px] max-h-[200px] resize-none border-0 bg-transparent p-4 shadow-none focus-visible:ring-0",
                isOverLimit && "text-destructive"
              )}
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
              {/* Left: Attach */}
              <div className="flex items-center gap-1">
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
                      className="size-8"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachments.length >= MAX_ATTACHMENTS}
                    >
                      <Paperclip className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach files</TooltipContent>
                </Tooltip>

                {/* Browse from client files */}
                {clientId && (
                  <ClientFilePicker
                    clientId={clientId}
                    onFileSelect={(file, existingFileId) => {
                      if (attachments.length >= MAX_ATTACHMENTS) {
                        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
                        return;
                      }
                      setAttachments((prev) => [
                        ...prev,
                        { id: crypto.randomUUID(), name: file.name, size: file.size, file, existingFileId },
                      ]);
                    }}
                    maxAttachments={MAX_ATTACHMENTS}
                    currentAttachmentCount={attachments.length}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={attachments.length >= MAX_ATTACHMENTS}
                    >
                      <FolderOpen className="size-4" />
                    </Button>
                  </ClientFilePicker>
                )}
              </div>

              {/* Right: Mode selector + Send */}
              <div className="flex items-center gap-2">
                {/* Mode Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8">
                      {mode === "email" ? (
                        <>
                          <Mail className="size-4" />
                          Email
                        </>
                      ) : (
                        <>
                          <MessageSquare className="size-4" />
                          Message
                        </>
                      )}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => setMode("message")}
                      className="gap-2"
                    >
                      <MessageSquare className="size-4" />
                      <div className="flex flex-col">
                        <span>Message</span>
                        <span className="text-xs text-muted-foreground">
                          {availableModes.message
                            ? "Send via Bridge"
                            : "Not on Bridge yet"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setMode("email")}
                      className="gap-2"
                    >
                      <Mail className="size-4" />
                      <div className="flex flex-col">
                        <span>Email</span>
                        <span className="text-xs text-muted-foreground">
                          {availableModes.email
                            ? contact?.email ?? "Send to selected contacts"
                            : !gmailConnected
                              ? "Connect Gmail first"
                              : "No email address"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={!hasContentToSend}
                  size="sm"
                  className="gap-1.5"
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
                  To send emails from SALT, you need to connect your Gmail account.
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
