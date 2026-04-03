"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
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
import type { PipelineStage } from "@/app/actions/insights/get-sales-dashboard";

interface PipelineFunnelChartProps {
  data: PipelineStage[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Monochrome gradient colors (white to dark gray)
const STAGE_COLORS: Record<string, string> = {
  Inquiry: "hsl(0 0% 100%)", // White
  Discovery: "hsl(0 0% 85%)", // Very light gray
  Pitch: "hsl(0 0% 70%)", // Light gray
  Active: "hsl(0 0% 55%)", // Medium gray
  Complete: "hsl(0 0% 45%)", // Medium-dark gray
  "On Hold": "hsl(0 0% 35%)", // Dark gray
  Lost: "hsl(0 0% 25%)", // Darker gray
};

const chartConfig = {
  count: {
    label: "Leads",
    color: "var(--primary)",
  },
  label: {
    color: "white",
  },
} satisfies ChartConfig;

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  const totalLeads = data.reduce((sum, d) => sum + d.count, 0);
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  // Get max count for proportional sizing
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Transform data with colors - show ALL stages
  // Ensure minimum bar width (12% of max) - just enough for longest label "Complete"
  const minBarValue = maxCount * 0.12;
  const chartData = data.map((stage) => ({
    ...stage,
    fill: STAGE_COLORS[stage.name] || "#6b9cff",
    displayCount: stage.count,
    // Ensure minimum width so label fits, otherwise use actual count
    count: Math.max(stage.count, minBarValue),
  }));

  // Calculate active pipeline (Inquiry + Discovery + Pitch)
  const activePipeline = data
    .filter((s) => ["Inquiry", "Discovery", "Pitch"].includes(s.name))
    .reduce((sum, s) => sum + s.count, 0);

  // Calculate converted (Active + Complete)
  const converted = data
    .filter((s) => ["Active", "Complete"].includes(s.name))
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
        <CardDescription>
          {totalLeads > 0
            ? `${totalLeads} leads · ${formatCurrency(totalValue)} potential`
            : "Track leads through your sales funnel"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 32 }}
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
            <Bar dataKey="count" radius={4} barSize={28}>
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
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {converted > 0 ? (
            <>
              {converted} converted to active clients <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {activePipeline} leads in active pipeline <TrendingUp className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground">
          Showing all stages from lead to completion
        </div>
      </CardFooter>
    </Card>
  );
}
