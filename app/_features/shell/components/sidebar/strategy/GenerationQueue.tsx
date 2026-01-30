"use client";

import { Loader2, CheckCircle2, Circle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

interface QueueItem {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

/**
 * GenerationQueue - Shows active AI generation tasks
 * Claude Cowork-inspired progress visualization
 */
export function GenerationQueue() {
  // Mock data - will be replaced with real queue data
  const queueItems: QueueItem[] = [];
  const isGenerating = queueItems.some((item) => item.status === "in_progress");

  const getStatusIcon = (status: QueueItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Generation Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {queueItems.length === 0 ? (
          <div className="text-center py-6">
            <div className="flex justify-center items-center gap-2 mb-3">
              <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              <div className="h-px w-4 bg-muted-foreground/30" />
              <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              <div className="h-px w-4 bg-muted-foreground/30" />
              <Circle className="h-3 w-3 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No active generations</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a report or audit to see progress here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Progress visualization like Claude's Cowork mode */}
            <div className="flex justify-center items-center gap-1 py-2">
              {queueItems.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center">
                  {getStatusIcon(item.status)}
                  {index < queueItems.length - 1 && index < 4 && (
                    <div
                      className={`h-px w-4 mx-1 ${
                        item.status === "completed"
                          ? "bg-green-500"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Current task detail */}
            {queueItems
              .filter((item) => item.status === "in_progress")
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-md bg-muted/50 text-sm"
                >
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Processing...
                  </p>
                </div>
              ))}

            {/* Pending items */}
            {queueItems.filter((item) => item.status === "pending").length >
              0 && (
              <p className="text-xs text-muted-foreground">
                {queueItems.filter((item) => item.status === "pending").length}{" "}
                more in queue
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
