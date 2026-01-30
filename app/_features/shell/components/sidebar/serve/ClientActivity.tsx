"use client";

import { Activity, Eye, Download, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

interface ActivityItem {
  id: string;
  action: "viewed" | "downloaded";
  resource: string;
  clientName: string;
  timestamp: string;
}

/**
 * ClientActivity - Shows recent client portal activity
 * Views, downloads, and interactions from clients
 */
export function ClientActivity() {
  // Mock data - will be replaced with real activity tracking
  const activities: ActivityItem[] = [];

  const getActionIcon = (action: ActivityItem["action"]) => {
    switch (action) {
      case "downloaded":
        return <Download className="h-4 w-4 text-green-500" />;
      case "viewed":
      default:
        return <Eye className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActionLabel = (action: ActivityItem["action"]) => {
    switch (action) {
      case "downloaded":
        return "downloaded";
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
          Client Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Client portal visits will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5">{getActionIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.clientName}</span>{" "}
                    {getActionLabel(activity.action)}{" "}
                    <span className="text-muted-foreground">
                      {activity.resource}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {activity.timestamp}
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
