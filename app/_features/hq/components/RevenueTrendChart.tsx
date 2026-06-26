"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui";
import type { ChartConfig } from "@repo/ui";
import type { RevenueTrendPoint } from "@/app/_features/hq/actions/types";

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
}

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(0 0% 100%)",
  },
  mrr: {
    label: "Recurring",
    color: "hsl(0 0% 70%)",
  },
  oneTime: {
    label: "One-time",
    color: "hsl(0 0% 45%)",
  },
} satisfies ChartConfig;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const totalRevenue = data.reduce((sum, d) => sum + d.total, 0);
  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];

  const trend = previousMonth && previousMonth.total > 0
    ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
    : 0;

  // Empty state when no revenue data
  if (totalRevenue === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Last 6 months performance</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center pb-0">
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <DollarSign className="h-8 w-8" />
            <span className="text-sm">No revenue data yet</span>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-center gap-2 text-sm pt-4">
          <div className="leading-none text-muted-foreground">
            Revenue will appear once invoices are paid
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Revenue Trend</CardTitle>
        <CardDescription>Last 6 months performance</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 10, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              fontSize={11}
              width={45}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span>
                      {chartConfig[name as keyof typeof chartConfig]?.label}: {formatCurrency(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 0% 100%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(0 0% 100%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="total"
              type="monotone"
              fill="url(#fillTotal)"
              stroke="hsl(0 0% 100%)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none">
          {formatCurrency(totalRevenue)} total revenue <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          {trend >= 0 ? "+" : ""}{trend.toFixed(0)}% vs last month
        </div>
      </CardFooter>
    </Card>
  );
}
