"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { ClientHealthData } from "@/app/actions/insights/get-clients-dashboard";

interface ClientHealthChartProps {
  data: ClientHealthData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ClientHealthChart({ data }: ClientHealthChartProps) {
  const hasData = data.total > 0;

  // Calculate percentages for the bar
  const healthyPercent = hasData ? (data.healthy / data.total) * 100 : 0;
  const warningPercent = hasData ? (data.warning / data.total) * 100 : 0;
  const atRiskPercent = hasData ? (data.atRisk / data.total) * 100 : 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Client Health</CardTitle>
        <CardDescription>
          {hasData
            ? `${data.total} active client${data.total === 1 ? "" : "s"}`
            : "No active clients yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horizontal Stacked Bar */}
        {hasData ? (
          <div className="space-y-3">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
              {data.healthy > 0 && (
                <div
                  className="transition-all bg-foreground"
                  style={{ width: `${healthyPercent}%` }}
                />
              )}
              {data.warning > 0 && (
                <div
                  className="transition-all"
                  style={{ width: `${warningPercent}%`, backgroundColor: "hsl(0 0% 65%)" }}
                />
              )}
              {data.atRisk > 0 && (
                <div
                  className="transition-all"
                  style={{ width: `${atRiskPercent}%`, backgroundColor: "hsl(0 0% 40%)" }}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-foreground" />
                <span className="text-muted-foreground">Healthy</span>
                <span className="font-medium">{data.healthy}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full" style={{ backgroundColor: "hsl(0 0% 65%)" }} />
                <span className="text-muted-foreground">Warning</span>
                <span className="font-medium">{data.warning}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full" style={{ backgroundColor: "hsl(0 0% 40%)" }} />
                <span className="text-muted-foreground">At Risk</span>
                <span className="font-medium">{data.atRisk}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-4 w-full items-center justify-center rounded-full border-2 border-dashed">
            <span className="text-xs text-muted-foreground">No data</span>
          </div>
        )}

        {/* Top Clients */}
        {data.topClients.length > 0 && (
          <div className="border-t pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top Clients by Value
            </p>
            <div className="space-y-2">
              {data.topClients.slice(0, 5).map((client, index) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">
                    {index + 1}. {client.name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(client.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
