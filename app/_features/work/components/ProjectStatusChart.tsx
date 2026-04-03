"use client";

import { LabelList, Pie, PieChart } from "recharts";
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
import type { ProjectStatusBreakdown } from "@/app/actions/insights/get-work-dashboard";

interface ProjectStatusChartProps {
  data: ProjectStatusBreakdown[];
}

const chartConfig = {
  count: {
    label: "Projects",
  },
  Active: {
    label: "Active",
    color: "hsl(0 0% 100%)", // White
  },
  "On Hold": {
    label: "On Hold",
    color: "hsl(0 0% 80%)", // Light gray
  },
  Completed: {
    label: "Completed",
    color: "hsl(0 0% 60%)", // Medium gray
  },
  Cancelled: {
    label: "Cancelled",
    color: "hsl(0 0% 45%)", // Darker gray
  },
} satisfies ChartConfig;

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  const totalProjects = data.reduce((sum, d) => sum + d.count, 0);
  const activeCount = data.find((d) => d.name === "Active")?.count || 0;

  // Transform data with colors from config
  const chartData = data
    .filter((status) => status.count > 0)
    .map((status) => ({
      ...status,
      fill: `var(--color-${status.name.replace(" ", "-")})`,
    }));

  // If no data, create sample data for visual
  if (chartData.length === 0) {
    chartData.push(
      { name: "Active", count: 3, fill: "var(--color-Active)" },
      { name: "On Hold", count: 1, fill: "var(--color-On-Hold)" },
      { name: "Completed", count: 2, fill: "var(--color-Completed)" }
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Project Status</CardTitle>
        <CardDescription>Portfolio breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center pb-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-[200px] [&_.recharts-text]:fill-background"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="count" hideLabel />}
            />
            <Pie data={chartData} dataKey="count" nameKey="name">
              <LabelList
                dataKey="name"
                className="fill-background"
                stroke="none"
                fontSize={12}
                formatter={(value: string) =>
                  chartConfig[value as keyof typeof chartConfig]?.label
                }
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none">
          {activeCount} active project{activeCount !== 1 ? "s" : ""} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing {totalProjects > 0 ? totalProjects : "sample"} project status
        </div>
      </CardFooter>
    </Card>
  );
}
