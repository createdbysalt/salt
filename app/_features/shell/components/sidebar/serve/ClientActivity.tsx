"use client";

import { Activity, Eye, Download, Clock, MessageSquare, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { useServeClientSafe } from "../../../hooks/useServeClient";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  action: "viewed" | "downloaded" | "message" | "file_uploaded";
  resource: string;
  clientName: string;
  timestamp: Date;
}

/**
 * ClientActivity - Shows recent client portal activity
 * Connected to ServeClientContext to show selected client's activity
 */
export function ClientActivity() {
  const { selectedClient, isLoaded } = useServeClientSafe();

  // Loading state
  if (!isLoaded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Client Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 bg-muted rounded mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock activity data based on selected client
  // In a full implementation, this would fetch from bridge_sessions or similar
  const activities: ActivityItem[] = selectedClient
    ? [
        {
          id: "1",
          action: "viewed",
          resource: "Project Overview",
          clientName: selectedClient.name,
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        },
        {
          id: "2",
          action: "message",
          resource: "New message sent",
          clientName: selectedClient.name,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        },
        {
          id: "3",
          action: "downloaded",
          resource: "Design_v3.pdf",
          clientName: selectedClient.name,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        },
      ]
    : [];

  const getActionIcon = (action: ActivityItem["action"]) => {
    switch (action) {
      case "downloaded":
        return <Download className="h-4 w-4 text-blue-500" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "file_uploaded":
        return <FileText className="h-4 w-4 text-purple-500" />;
      case "viewed":
      default:
        return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: ActivityItem["action"]) => {
    switch (action) {
      case "downloaded":
        return "downloaded";
      case "message":
        return "sent message";
      case "file_uploaded":
        return "uploaded";
      case "viewed":
      default:
        return "viewed";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {selectedClient ? "Recent Activity" : "Client Activity"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedClient ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No client selected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select a client to see their activity
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Portal visits will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5">{getActionIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="text-muted-foreground">
                      {getActionLabel(activity.action)}
                    </span>{" "}
                    <span className="font-medium truncate">
                      {activity.resource}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
