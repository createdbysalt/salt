import type { WidgetProps } from "@/app/_features/portal/types/bridge-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";
import { FileText, FolderOpen } from "lucide-react";
import { formatDistanceToNow, subDays } from "date-fns";

/**
 * Recent Activity Widget
 * Shows recent requests and file uploads
 */
export function RecentActivityWidget({ config, data }: WidgetProps) {
  const activityDays = config.settings?.activityDays || 7;
  const cutoffDate = subDays(new Date(), activityDays);

  // Filter activity by date range
  const recentItems = [
    ...(data.recentRequests || [])
      .filter((r) => new Date(r.created_at) >= cutoffDate)
      .map((r) => ({
        type: "request" as const,
        id: r.id,
        title: r.title,
        status: r.status,
        date: r.created_at,
      })),
    ...(data.recentFiles || [])
      .filter((f) => new Date(f.created_at) >= cutoffDate)
      .map((f) => ({
        type: "file" as const,
        id: f.id,
        title: f.file_name,
        date: f.created_at,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">Last {activityDays} days</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {recentItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recent activity
            </p>
          ) : (
            <div className="space-y-4">
              {recentItems.slice(0, 5).map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="rounded-full bg-primary/10 p-2">
                    {item.type === "request" ? (
                      <FileText className="h-4 w-4 text-primary" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.date), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {item.type === "request" && "status" in item && (
                    <Badge variant="outline" className="capitalize text-xs">
                      {item.status.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

