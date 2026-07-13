import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { cn } from "@repo/utils";
import type { ReactNode } from "react";

interface TrustMetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral" | "attention";
}

export function TrustMetricCard({
  title,
  value,
  description,
  icon,
  trend = "neutral",
}: TrustMetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold",
            trend === "up" && "text-emerald-600",
            trend === "down" && "text-red-600",
            trend === "attention" && "text-orange-600"
          )}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
