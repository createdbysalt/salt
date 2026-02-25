"use client";

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import {
  Badge,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { MetricCard } from "@/app/actions/insights/types";

interface StudioMetricCardsProps {
  metrics: {
    revenue: MetricCard;
    activeClients: MetricCard;
    projectsInFlight: MetricCard;
    pipelineValue: MetricCard;
  };
}

function MetricCardItem({ metric }: { metric: MetricCard }) {
  const TrendIcon = metric.badge.trend === "up" ? IconTrendingUp : IconTrendingDown;
  const isPositive = metric.badge.trend === "up";

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{metric.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {metric.value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendIcon />
            {metric.badge.value}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {metric.context.line1}{" "}
          {isPositive ? (
            <IconTrendingUp className="size-4" />
          ) : (
            <IconTrendingDown className="size-4" />
          )}
        </div>
        <div className="text-muted-foreground">{metric.context.line2}</div>
      </CardFooter>
    </Card>
  );
}

export function StudioMetricCards({ metrics }: StudioMetricCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <MetricCardItem metric={metrics.revenue} />
      <MetricCardItem metric={metrics.activeClients} />
      <MetricCardItem metric={metrics.projectsInFlight} />
      <MetricCardItem metric={metrics.pipelineValue} />
    </div>
  );
}
