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
  AlertCircle,
} from "lucide-react";
import {
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
): MessageMode | null {
  if (conversationType === "direct") {
    if (contact?.hasBridge) return "message";
    if (contact?.hasEmail && gmailConnected) return "email";
    return null;
  }

  // General channel
  const hasAnyBridgeUsers = contacts?.some((c) => c.hasBridge) ?? false;
  if (hasAnyBridgeUsers) return "message";
  if (gmailConnected) return "email";
  return null;
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
      // Email is "available" if Gmail is connected AND contact has email
      email: hasEmailAddress && gmailConnected,
      // Track if email address exists (for showing "connect Gmail" prompt)
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

  // Mode state
  const availableModes = getAvailableModes(conversationType, contact, contacts, gmailConnected);
  const defaultMode = getDefaultMode(conversationType, contact, contacts, gmailConnected);
  const [mode, setMode] = React.useState<MessageMode | null>(defaultMode);

  // Update mode when capabilities change
  React.useEffect(() => {
    const newDefaultMode = getDefaultMode(conversationType, contact, contacts, gmailConnected);
    if (newDefaultMode && !mode) {
      setMode(newDefaultMode);
    }
  }, [conversationType, contact, contacts, gmailConnected, mode]);

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
  const canSend = !isEmpty && !isOverLimit && !isSending && !disabled && mode && hasValidRecipients;

  // Handlers
  const handleSend = React.useCallback(async () => {
    if (!canSend || !mode) return;

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
  }, [canSend, mode, content, attachments, selectedFromId, selectedRecipientIds, subject, onSend]);

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

  // ============================================================================
  // Render: State E - Neither available (no Bridge AND no email capability)
  // ============================================================================

  // If they have an email but Gmail isn't connected, show "Connect Gmail" prompt
  if (!availableModes.message && !availableModes.email && availableModes.hasEmailAddress) {
    return (
      <div className={cn("border-t bg-card p-6", className)}>
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Mail className="size-6 text-muted-foreground" />
          </div>
          <h4 className="font-medium">Connect Gmail to send emails</h4>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            This contact isn&apos;t on Bridge yet. Connect your Gmail to email them directly.
          </p>
          <div className="flex gap-2">
            {onConnectGmail && (
              <Button onClick={onConnectGmail}>
                <Mail className="size-4" />
                Connect Gmail
              </Button>
            )}
            {onInviteToBridge && (
              <Button variant="outline" onClick={onInviteToBridge}>
                <LinkIcon className="size-4" />
                Invite to Bridge
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // True "can't message" state - no Bridge AND no email address at all
  if (!availableModes.message && !availableModes.email && !availableModes.hasEmailAddress) {
    return (
      <div className={cn("border-t bg-card p-6", className)}>
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <AlertCircle className="size-6 text-muted-foreground" />
          </div>
          <h4 className="font-medium">Can&apos;t message yet</h4>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add their email address or invite them to Bridge to start a conversation.
          </p>
          <div className="flex gap-2">
            {onAddEmail && (
              <Button variant="outline" size="sm" onClick={onAddEmail}>
                <Mail className="size-4" />
                Add Email
              </Button>
            )}
            {onInviteToBridge && (
              <Button variant="outline" size="sm" onClick={onInviteToBridge}>
                <LinkIcon className="size-4" />
                Invite to Bridge
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Normal composer
  // ============================================================================

  const showEmailFields = mode === "email";
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
        <div className="p-4">
          <div className="rounded-lg border bg-background">
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
                "min-h-[80px] max-h-[200px] resize-none border-0 bg-transparent p-4 shadow-none focus-visible:ring-0",
                isOverLimit && "text-destructive"
              )}
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 pb-3">
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
                      disabled={!availableModes.message}
                      className="gap-2"
                    >
                      <MessageSquare className="size-4" />
                      <div className="flex flex-col">
                        <span>Message</span>
                        <span className="text-xs text-muted-foreground">
                          {availableModes.message
                            ? "Send via Bridge"
                            : "Not on Bridge"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setMode("email")}
                      disabled={!availableModes.email}
                      className="gap-2"
                    >
                      <Mail className="size-4" />
                      <div className="flex flex-col">
                        <span>Email</span>
                        <span className="text-xs text-muted-foreground">
                          {availableModes.email
                            ? contact?.email ?? "Send to selected contacts"
                            : !gmailConnected
                              ? "Gmail not connected"
                              : "No email address"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Contextual hint */}
                {mode === "email" && !gmailConnected && onConnectGmail && (
                  <Button variant="link" size="sm" onClick={onConnectGmail} className="text-xs">
                    Connect Gmail
                  </Button>
                )}
                {mode === "message" && !availableModes.message && onInviteToBridge && (
                  <Button variant="link" size="sm" onClick={onInviteToBridge} className="text-xs">
                    Invite to Bridge
                  </Button>
                )}

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  size="icon"
                  className="size-8 rounded-full"
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
