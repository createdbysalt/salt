"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { MessageSquarePlus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getAvailableClientsForChat,
  type AvailableClient,
} from "@/app/actions/messaging/get-available-chats";
import { getOrCreateConversation } from "@/app/actions/messaging/conversation-actions";

// ============================================================================
// Types
// ============================================================================

interface NewChatModalProps {
  /** Callback when a conversation is selected or created */
  onConversationSelect: (conversationId: string, clientName: string) => void;
  /** Variant for styling */
  variant?: "dashboard" | "bridge";
  /** Optional className */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Component
// ============================================================================

export function NewChatModal({
  onConversationSelect,
  variant = "dashboard",
  className,
}: NewChatModalProps) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<AvailableClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch clients when modal opens
  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  async function fetchClients() {
    setIsLoading(true);
    setError(null);

    const result = await getAvailableClientsForChat();

    if ("error" in result) {
      setError(result.error);
    } else {
      setClients(result.data);
    }

    setIsLoading(false);
  }

  async function handleSelectClient(client: AvailableClient) {
    // If conversation exists, just select it
    if (client.hasExistingConversation && client.conversationId) {
      onConversationSelect(client.conversationId, client.name);
      setOpen(false);
      return;
    }

    // Create new conversation
    setIsCreating(client.id);

    const result = await getOrCreateConversation(client.id);

    if ("error" in result) {
      setError(result.error);
      setIsCreating(null);
      return;
    }

    onConversationSelect(result.data.id, client.name);
    setOpen(false);
    setIsCreating(null);
  }

  // Filter clients based on search
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate clients with and without existing conversations
  const newClients = filteredClients.filter((c) => !c.hasExistingConversation);
  const existingClients = filteredClients.filter((c) => c.hasExistingConversation);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
          <DialogDescription>
            Select a client to start or continue a conversation.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Client List */}
        <div className="max-h-[300px] overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-destructive">
              {error}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? "No clients found" : "No clients available"}
            </div>
          ) : (
            <div className="space-y-1">
              {/* New conversations section */}
              {newClients.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                    Start New
                  </div>
                  {newClients.map((client) => (
                    <ClientListItem
                      key={client.id}
                      client={client}
                      isCreating={isCreating === client.id}
                      onSelect={() => handleSelectClient(client)}
                    />
                  ))}
                </>
              )}

              {/* Existing conversations section */}
              {existingClients.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2">
                    Continue Conversation
                  </div>
                  {existingClients.map((client) => (
                    <ClientListItem
                      key={client.id}
                      client={client}
                      isCreating={isCreating === client.id}
                      onSelect={() => handleSelectClient(client)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ClientListItemProps {
  client: AvailableClient;
  isCreating: boolean;
  onSelect: () => void;
}

function ClientListItem({ client, isCreating, onSelect }: ClientListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isCreating}
      className={cn(
        "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs">
          {getInitials(client.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{client.name}</span>
          {client.hasExistingConversation && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Active
            </Badge>
          )}
        </div>
        {client.contactEmail && (
          <p className="text-xs text-muted-foreground truncate">
            {client.contactEmail}
          </p>
        )}
      </div>
      {isCreating && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
      )}
    </button>
  );
}
