"use client";

import { TrendingUp, AlertCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell } from "recharts";
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

export interface MilestoneStatusData {
  completed: number;
  upcoming: number;
  overdue: number;
  future: number;
}

interface MilestoneStatusChartProps {
  data: MilestoneStatusData;
}

// Monochrome gradient colors (white to dark gray)
const STATUS_COLORS: Record<string, string> = {
  Completed: "hsl(0 0% 100%)", // White
  Upcoming: "hsl(0 0% 80%)", // Light gray
  Overdue: "hsl(0 0% 60%)", // Medium gray
  Future: "hsl(0 0% 45%)", // Darker gray
};

const chartConfig = {
  count: {
    label: "Milestones",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function MilestoneStatusChart({ data }: MilestoneStatusChartProps) {
  const totalMilestones = data.completed + data.upcoming + data.overdue + data.future;
  const hasOverdue = data.overdue > 0;

  // Transform data for the chart
  const chartData = [
    { status: "Completed", count: data.completed, fill: STATUS_COLORS.Completed },
    { status: "Upcoming", count: data.upcoming, fill: STATUS_COLORS.Upcoming },
    { status: "Overdue", count: data.overdue, fill: STATUS_COLORS.Overdue },
    { status: "Future", count: data.future, fill: STATUS_COLORS.Future },
  ].filter((item) => item.count > 0);

  // If no data, show sample
  if (chartData.length === 0) {
    chartData.push(
      { status: "Completed", count: 5, fill: STATUS_COLORS.Completed },
      { status: "Upcoming", count: 3, fill: STATUS_COLORS.Upcoming },
      { status: "Future", count: 4, fill: STATUS_COLORS.Future }
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Milestone Status</CardTitle>
        <CardDescription>Delivery tracking</CardDescription>
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
          {hasOverdue ? (
            <>
              {data.overdue} overdue milestone{data.overdue !== 1 ? "s" : ""} <AlertCircle className="h-4 w-4 text-destructive" />
            </>
          ) : (
            <>
              {data.completed} completed this period <TrendingUp className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground">
          {totalMilestones > 0 ? `${totalMilestones} total milestones` : "Sample milestone data"}
        </div>
      </CardFooter>
    </Card>
  );
}
