"use client";

import { format } from "date-fns";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/_components/ui/avatar";
import { cn } from "@repo/utils";
import type { SearchResult, FullTextSearchResult, FullTextMessage } from "@/app/actions/messaging/search-actions";
import type { Message } from "@/app/actions/messaging/message-actions";

// Union type to support both old and new search result formats
type SearchResultUnion = SearchResult | FullTextSearchResult;
type MessageUnion = Message | FullTextMessage;

// ============================================================================
// Types
// ============================================================================

interface MessageSearchResultsProps {
  results: SearchResultUnion[];
  query: string;
  onSelectResult: (conversationId: string, messageId: string) => void;
  className?: string;
}

interface SearchResultItemProps {
  result: SearchResultUnion;
  query: string;
  onSelect: (conversationId: string, messageId: string) => void;
}

interface MessagePreviewProps {
  message: MessageUnion;
  query: string;
  onSelect: () => void;
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

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function truncateContent(content: string, query: string, maxLength: number = 150): string {
  // Find the position of the query in the content
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1 || content.length <= maxLength) {
    return content.length > maxLength ? content.slice(0, maxLength) + "..." : content;
  }

  // Calculate start position to center the match
  const contextBefore = Math.floor((maxLength - query.length) / 2);
  let start = Math.max(0, matchIndex - contextBefore);
  let end = Math.min(content.length, start + maxLength);

  // Adjust if we're at the end
  if (end === content.length) {
    start = Math.max(0, end - maxLength);
  }

  let result = content.slice(start, end);

  // Add ellipsis
  if (start > 0) {
    result = "..." + result;
  }
  if (end < content.length) {
    result = result + "...";
  }

  return result;
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted/50 rounded-full p-4 mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No results found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        No messages matching &quot;{query}&quot; were found. Try a different search term.
      </p>
    </div>
  );
}

// ============================================================================
// Message Preview Component
// ============================================================================

// Type guard to check if message has matchContext (FullTextMessage)
function hasMatchContext(msg: MessageUnion): msg is FullTextMessage {
  return "matchContext" in msg && typeof msg.matchContext === "string";
}

function MessagePreview({ message, query, onSelect }: MessagePreviewProps) {
  // Use matchContext if available (from full-text search), otherwise truncate content
  const displayContent = hasMatchContext(message)
    ? message.matchContext
    : truncateContent(message.content, query);

  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3 hover:bg-muted/50 rounded-md transition-colors animate-in fade-in-0 duration-150"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />
          <AvatarFallback className="text-xs">
            {getInitials(message.senderName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium">{message.senderName}</span>
            <span className="text-xs text-muted-foreground">
              {format(message.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {highlightMatch(displayContent, query)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Search Result Item Component
// ============================================================================

function SearchResultItem({ result, query, onSelect }: SearchResultItemProps) {
  return (
    <div className="border-b border-border last:border-b-0">
      {/* Conversation header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
        <Avatar className="h-8 w-8">
          <AvatarImage src={result.conversationAvatarUrl} alt={result.conversationName} />
          <AvatarFallback>{getInitials(result.conversationName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium">{result.conversationName}</h3>
          <p className="text-xs text-muted-foreground">
            {result.messages.length} matching message{result.messages.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Message previews */}
      <div className="px-2 py-1">
        {result.messages.map((message) => (
          <MessagePreview
            key={message.id}
            message={message}
            query={query}
            onSelect={() => onSelect(result.conversationId, message.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MessageSearchResults({
  results,
  query,
  onSelectResult,
  className,
}: MessageSearchResultsProps) {
  if (!query.trim()) {
    return null;
  }

  if (results.length === 0) {
    return <EmptySearchState query={query} />;
  }

  const totalCount = results.reduce((sum, r) => sum + r.messages.length, 0);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Results header */}
      <div className="px-4 py-2 border-b border-border">
        <p className="text-sm text-muted-foreground">
          Found {totalCount} message{totalCount !== 1 ? "s" : ""} in {results.length} conversation
          {results.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {results.map((result) => (
          <SearchResultItem
            key={result.conversationId}
            result={result}
            query={query}
            onSelect={onSelectResult}
          />
        ))}
      </div>
    </div>
  );
}
