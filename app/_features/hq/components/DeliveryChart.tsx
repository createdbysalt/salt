"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell } from "recharts";
import { CheckCircle2 } from "lucide-react";
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
import type { DeliveryPerformance } from "@/app/actions/insights/get-hq-insights";

interface DeliveryChartProps {
  data: DeliveryPerformance;
}

const STATUS_COLORS: Record<string, string> = {
  "On Time": "hsl(0 0% 100%)",
  "Late": "hsl(0 0% 65%)",
  "Pending": "hsl(0 0% 40%)",
};

const chartConfig = {
  count: {
    label: "Milestones",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function DeliveryChart({ data }: DeliveryChartProps) {
  const total = data.onTime + data.late + data.pending;
  const onTimeRate = data.onTime + data.late > 0
    ? Math.round((data.onTime / (data.onTime + data.late)) * 100)
    : 100;

  // Transform data for the chart
  const chartData = [
    { status: "On Time", count: data.onTime, fill: STATUS_COLORS["On Time"] },
    { status: "Late", count: data.late, fill: STATUS_COLORS["Late"] },
    { status: "Pending", count: data.pending, fill: STATUS_COLORS["Pending"] },
  ].filter((item) => item.count > 0);

  // If no data, show sample
  if (chartData.length === 0) {
    chartData.push(
      { status: "On Time", count: 8, fill: STATUS_COLORS["On Time"] },
      { status: "Late", count: 2, fill: STATUS_COLORS["Late"] },
      { status: "Pending", count: 5, fill: STATUS_COLORS["Pending"] }
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Delivery Performance</CardTitle>
        <CardDescription>Milestone completion tracking</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center pb-0">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ right: 16 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="status"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar dataKey="count" radius={4}>
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="status"
                position="insideLeft"
                offset={8}
                className="fill-background"
                fontSize={12}
                fontWeight={500}
              />
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none">
          <CheckCircle2 className="h-4 w-4" />
          {onTimeRate}% on-time delivery
        </div>
        <div className="leading-none text-muted-foreground">
          {total > 0 ? `${total} milestones tracked` : "Sample data"}
        </div>
      </CardFooter>
    </Card>
  );
}
