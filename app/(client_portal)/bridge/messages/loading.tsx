import { Skeleton } from "@/app/_components/ui/skeleton";
import { Card } from "@/app/_components/ui/card";

/**
 * Bridge messages page loading skeleton
 */
export default function BridgeMessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Conversation List */}
      <Card className="w-80 shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Message Area */}
      <Card className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[70%] space-y-1 ${i % 2 === 0 ? "items-end" : "items-start"}`}>
                <Skeleton className={`h-16 ${i % 2 === 0 ? "w-48" : "w-64"} rounded-lg`} />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </Card>
    </div>
  );
}
