import { MessageSquare } from "lucide-react";

/**
 * Clients Messages Page
 * All client communications in one place
 */
export default function ClientsMessagesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          All client communications in one place.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="rounded-full bg-muted p-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No messages yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Client messages and conversations will appear here. Start a conversation from a client&apos;s detail page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
