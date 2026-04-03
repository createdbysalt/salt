"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@repo/ui";
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
} from "@repo/ui";
import type { ChartConfig } from "@repo/ui";
import type { RevenueChartPoint } from "@/app/actions/insights/types";

interface RevenueChartProps {
  data: RevenueChartPoint[];
}

const chartConfig = {
  revenue: {
    label: "Revenue",
  },
  recurring: {
    label: "Retainer",
    color: "var(--primary)",
  },
  oneTime: {
    label: "Project",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

// Time range configuration
const TIME_RANGES = {
  "90d": { days: 90, label: "Last 3 months" },
  "30d": { days: 30, label: "Last 30 days" },
  "7d": { days: 7, label: "Last 7 days" },
} as const;

export function RevenueChart({ data }: RevenueChartProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<keyof typeof TIME_RANGES>("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("30d");
    }
  }, [isMobile]);

  // Filter data based on selected time range
  const filteredData = React.useMemo(() => {
    const config = TIME_RANGES[timeRange];
    // Take the last N days from the data array (data is already sorted chronologically)
    // This avoids timezone issues since we're just slicing the array
    return data.slice(-config.days);
  }, [data, timeRange]);

  // Calculate total revenue for the filtered period
  const totalRevenue = React.useMemo(() => {
    return filteredData.reduce(
      (sum, point) => sum + point.recurring + point.oneTime,
      0
    );
  }, [filteredData]);

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalRevenue);

  // Dynamic description based on time range
  const periodLabel = TIME_RANGES[timeRange].label.toLowerCase();

  // Format date for X-axis based on time range
  // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shift
  const formatDateForAxis = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Dynamic tick gap based on time range
  const minTickGap = timeRange === "7d" ? 16 : timeRange === "30d" ? 24 : 32;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {formattedTotal} total for the {periodLabel}
          </span>
          <span className="@[540px]/card:hidden">{TIME_RANGES[timeRange].label}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value as keyof typeof TIME_RANGES)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as keyof typeof TIME_RANGES)}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
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
              <linearGradient id="fillOneTime" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-oneTime)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-oneTime)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillRecurring" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-recurring)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-recurring)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={minTickGap}
              tickFormatter={formatDateForAxis}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const [year, month, day] = String(value).split("-").map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="recurring"
              type="monotone"
              fill="url(#fillRecurring)"
              stroke="var(--color-recurring)"
              stackId="a"
            />
            <Area
              dataKey="oneTime"
              type="monotone"
              fill="url(#fillOneTime)"
              stroke="var(--color-oneTime)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
