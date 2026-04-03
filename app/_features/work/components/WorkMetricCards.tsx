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

interface WorkMetricCardsProps {
  metrics: {
    activeProjects: MetricCard;
    activeRetainers: MetricCard;
    milestonesThisWeek: MetricCard;
    overdueItems: MetricCard;
  };
}

function MetricCardItem({ metric }: { metric: MetricCard }) {
  const TrendIcon = metric.badge.trend === "up" ? IconTrendingUp : IconTrendingDown;
  const showTrendIcon = metric.badge.trend !== "neutral";

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{metric.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {metric.value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {showTrendIcon && <TrendIcon />}
            {metric.badge.value}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {metric.context.line1}
        </div>
        <div className="text-muted-foreground">{metric.context.line2}</div>
      </CardFooter>
    </Card>
  );
}

export function WorkMetricCards({ metrics }: WorkMetricCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <MetricCardItem metric={metrics.activeProjects} />
      <MetricCardItem metric={metrics.activeRetainers} />
      <MetricCardItem metric={metrics.milestonesThisWeek} />
      <MetricCardItem metric={metrics.overdueItems} />
    </div>
  );
}
