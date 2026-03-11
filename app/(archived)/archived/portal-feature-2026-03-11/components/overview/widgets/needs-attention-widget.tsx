import type { WidgetProps } from "@/app/_features/portal/types/bridge-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { AlertCircle, Info, DollarSign } from "lucide-react";
import Link from "next/link";

/**
 * Needs Attention Widget
 * Shows smart alerts based on project/request status
 */
export function NeedsAttentionWidget({ config, data }: WidgetProps) {
  const alerts: Array<{
    type: "warning" | "info" | "default";
    icon: React.ReactNode;
    message: string;
    link?: string;
  }> = [];

  // Check for pending requests needing attention
  const pendingRequests = data.recentRequests?.filter(
    (r) => r.status === "open" || r.status === "waiting_for_client"
  );

  if (pendingRequests && pendingRequests.length > 0) {
    alerts.push({
      type: "warning",
      icon: <AlertCircle className="h-4 w-4" />,
      message: `${pendingRequests.length} request${
        pendingRequests.length > 1 ? "s" : ""
      } need${pendingRequests.length === 1 ? "s" : ""} your attention`,
      link: "/requests",
    });
  }

  // Check for projects in draft/signed status (might need approval)
  const projectsNeedingAttention = data.projects?.filter(
    (p) => p.status === "signed" || p.status === "draft"
  );

  if (projectsNeedingAttention && projectsNeedingAttention.length > 0) {
    alerts.push({
      type: "info",
      icon: <Info className="h-4 w-4" />,
      message: `${projectsNeedingAttention.length} project${
        projectsNeedingAttention.length > 1 ? "s" : ""
      } ready to start`,
      link: "/projects",
    });
  }

  // If no alerts, show positive message
  if (alerts.length === 0) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-success/10 p-2">
              <Info className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-success">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                No items need your attention right now.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Needs Your Attention</h2>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
              >
                <div
                  className={`rounded-full p-2 ${
                    alert.type === "warning"
                      ? "bg-warning/10 text-warning"
                      : alert.type === "info"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {alert.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.link && (
                    <Link
                      href={alert.link}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View details →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

