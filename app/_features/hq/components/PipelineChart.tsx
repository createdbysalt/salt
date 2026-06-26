"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell } from "recharts";
import { TrendingUp } from "lucide-react";
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
import type { HqPipelineStage } from "@/app/_features/hq/actions/types";

interface PipelineChartProps {
  data: HqPipelineStage[];
}

const STAGE_COLORS: Record<string, string> = {
  Inquiry: "hsl(0 0% 100%)",
  Discovery: "hsl(0 0% 85%)",
  Pitch: "hsl(0 0% 70%)",
  Active: "hsl(0 0% 55%)",
  Lost: "hsl(0 0% 40%)",
};

const chartConfig = {
  count: {
    label: "Leads",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function PipelineChart({ data }: PipelineChartProps) {
  const totalLeads = data.reduce((sum, d) => sum + d.count, 0);
  const activeCount = data.find((d) => d.name === "Active")?.count || 0;

  // Get max count for proportional sizing
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const minBarValue = maxCount * 0.12;

  // Transform data with colors
  const chartData = data.map((stage) => ({
    ...stage,
    fill: STAGE_COLORS[stage.name] || "hsl(0 0% 70%)",
    displayCount: stage.count,
    count: Math.max(stage.count, minBarValue),
  }));

  // If no data, show sample
  if (totalLeads === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Sales Pipeline</CardTitle>
          <CardDescription>Leads by stage</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center pb-0">
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8" />
            <span className="text-sm">No leads in pipeline</span>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-center gap-2 text-sm pt-4">
          <div className="leading-none text-muted-foreground">
            Add leads to track your pipeline
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Sales Pipeline</CardTitle>
        <CardDescription>Leads by stage</CardDescription>
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
              dataKey="name"
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
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="name"
                position="insideLeft"
                offset={8}
                className="fill-background"
                fontSize={12}
                fontWeight={500}
              />
              <LabelList
                dataKey="displayCount"
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
          <TrendingUp className="h-4 w-4" />
          {totalLeads} leads in pipeline
        </div>
        <div className="leading-none text-muted-foreground">
          {activeCount} converted to active
        </div>
      </CardFooter>
    </Card>
  );
}
