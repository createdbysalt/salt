"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
  Checkbox,
  Label,
} from "@repo/ui";
import { cn } from "@repo/utils";

export interface GmailAccount {
  id: string;
  email: string;
  name: string;
}

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  selected?: boolean;
}

interface EmailFieldsProps {
  fromAccounts: GmailAccount[];
  selectedFromId: string;
  onFromChange: (accountId: string) => void;
  recipients: EmailRecipient[];
  selectedRecipientIds: string[];
  onRecipientsChange: (ids: string[]) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  isReply?: boolean;
  showRecipientPicker?: boolean;
  className?: string;
}

export function EmailFields({
  fromAccounts,
  selectedFromId,
  onFromChange,
  recipients,
  selectedRecipientIds,
  onRecipientsChange,
  subject,
  onSubjectChange,
  isReply = false,
  showRecipientPicker = false,
  className,
}: EmailFieldsProps) {
  const selectedFrom = fromAccounts.find((a) => a.id === selectedFromId);
  const selectedRecipients = recipients.filter((r) =>
    selectedRecipientIds.includes(r.id)
  );

  const toggleRecipient = (id: string) => {
    if (selectedRecipientIds.includes(id)) {
      onRecipientsChange(selectedRecipientIds.filter((rid) => rid !== id));
    } else {
      onRecipientsChange([...selectedRecipientIds, id]);
    }
  };

  const selectAll = () => {
    onRecipientsChange(recipients.map((r) => r.id));
  };

  return (
    <div className={cn("space-y-0 border-b border-border/30 bg-transparent", className)}>
      {/* From Field */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <Label className="text-sm text-muted-foreground w-16 shrink-0">
          From
        </Label>
        {fromAccounts.length === 0 ? (
          <span className="text-sm text-muted-foreground py-1">
            Connect Gmail to send emails
          </span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto py-1 px-2 justify-start font-normal gap-2"
              >
                {selectedFrom ? (
                  <>
                    <span className="font-medium">{selectedFrom.name}</span>
                    <span className="text-muted-foreground">
                      &lt;{selectedFrom.email}&gt;
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select account</span>
                )}
                <ChevronDown className="size-3 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              {fromAccounts.map((account) => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => onFromChange(account.id)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{account.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {account.email}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* To Field */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border/30">
        <Label className="text-sm text-muted-foreground w-16 shrink-0 pt-1">
          To
        </Label>
        <div className="flex-1 min-w-0">
          {showRecipientPicker ? (
            // Multiple recipient picker (for General channel)
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {selectedRecipients.map((recipient) => (
                  <Badge
                    key={recipient.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {recipient.name}
                    <button
                      type="button"
                      onClick={() => toggleRecipient(recipient.id)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {selectedRecipients.length === 0 && (
                  <span className="text-sm text-muted-foreground py-0.5">
                    Select recipients
                  </span>
                )}
              </div>
              {/* Recipient checkboxes */}
              <div className="space-y-1 pt-1">
                {recipients.map((recipient) => (
                  <label
                    key={recipient.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 -mx-1"
                  >
                    <Checkbox
                      checked={selectedRecipientIds.includes(recipient.id)}
                      onCheckedChange={() => toggleRecipient(recipient.id)}
                    />
                    <span>{recipient.name}</span>
                    <span className="text-muted-foreground truncate">
                      &lt;{recipient.email}&gt;
                    </span>
                  </label>
                ))}
                {recipients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={selectAll}
                  >
                    Select All
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Single recipient display (for DM)
            <div className="flex items-center gap-2 py-0.5">
              {selectedRecipients.length > 0 ? (
                <>
                  <span className="text-sm">{selectedRecipients[0].name}</span>
                  <span className="text-sm text-muted-foreground">
                    &lt;{selectedRecipients[0].email}&gt;
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No email address
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subject Field */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Label className="text-sm text-muted-foreground w-16 shrink-0">
          Subject
        </Label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={isReply ? "Re: Previous subject" : "Enter subject"}
          className="border-0 bg-transparent h-auto py-1.5 px-2 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
