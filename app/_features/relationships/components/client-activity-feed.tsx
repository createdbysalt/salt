"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Activity } from "lucide-react";

interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  project_name?: string;
}

interface ClientActivityFeedProps {
  activities: ActivityEvent[];
}

export function ClientActivityFeed({ activities }: ClientActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Across All Projects</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="border-l-2 border-muted pl-4 py-1">
              <p className="text-sm font-medium">{activity.description}</p>
              {activity.project_name && (
                <p className="text-xs text-muted-foreground">
                  {activity.project_name}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {activity.timestamp}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
