"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
  type ChartConfig,
} from "@repo/ui";
import { useIsMobile } from "@/app/_lib/hooks/use-mobile";
import type { SignupSeriesPoint } from "@/app/_features/admin/queries";

const chartConfig = {
  signups: {
    label: "Signups",
    color: "var(--primary)",
  },
  waitlist: {
    label: "Waitlist",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

/**
 * Signups over time — the dashboard-01 interactive area chart wired to real
 * data. Range toggle lives in CardAction (ToggleGroup on wide cards, Select
 * on narrow), exactly like the shadcn block.
 */
export function SignupChart({ data }: { data: SignupSeriesPoint[] }) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const daysToShow =
    timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const filteredData = data.slice(-daysToShow);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Signups</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            New users and waitlist leads per day, last {daysToShow} days
          </span>
          <span className="@[540px]/card:hidden">
            Last {daysToShow} days
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-signups)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-signups)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillWaitlist" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-waitlist)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-waitlist)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
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
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="waitlist"
              type="natural"
              fill="url(#fillWaitlist)"
              stroke="var(--color-waitlist)"
              strokeDasharray="4 3"
            />
            <Area
              dataKey="signups"
              type="natural"
              fill="url(#fillSignups)"
              stroke="var(--color-signups)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
