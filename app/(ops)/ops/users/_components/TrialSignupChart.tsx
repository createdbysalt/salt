"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  ToggleGroup,
  ToggleGroupItem,
  type ChartConfig,
} from "@repo/ui";
import type { PeriodOverPeriodPoint } from "@/app/_features/admin/queries";

const chartConfig = {
  current: {
    label: "This period",
    color: "var(--primary)",
  },
  previous: {
    label: "Prior period",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

/**
 * Daily signups this window vs the prior window of the same length.
 */
export function TrialSignupChart({ data }: { data: PeriodOverPeriodPoint[] }) {
  const [timeRange, setTimeRange] = React.useState("30d");
  const daysToShow = timeRange === "7d" ? 7 : 30;
  const filtered = data.slice(-daysToShow);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Signups</CardTitle>
        <CardDescription>
          New accounts per day vs the prior {daysToShow} days
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[540px]/card:flex"
          >
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart data={filtered} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) =>
                new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(`${value}T00:00:00Z`).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", timeZone: "UTC" },
                    )
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="previous"
              fill="var(--color-previous)"
              radius={4}
              opacity={0.45}
            />
            <Bar dataKey="current" fill="var(--color-current)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
