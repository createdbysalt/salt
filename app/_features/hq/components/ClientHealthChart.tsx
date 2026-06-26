"use client";

import { LabelList, Pie, PieChart } from "recharts";
import { Users } from "lucide-react";
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
import type { ClientHealthDistribution } from "@/app/_features/hq/actions/types";

interface ClientHealthChartProps {
  data: ClientHealthDistribution;
}

const chartConfig = {
  count: {
    label: "Clients",
  },
  healthy: {
    label: "Healthy",
    color: "hsl(0 0% 100%)",
  },
  warning: {
    label: "Warning",
    color: "hsl(0 0% 65%)",
  },
  atRisk: {
    label: "At Risk",
    color: "hsl(0 0% 40%)",
  },
} satisfies ChartConfig;

export function ClientHealthChart({ data }: ClientHealthChartProps) {
  const totalClients = data.healthy + data.warning + data.atRisk;
  const healthyPercent = totalClients > 0 ? Math.round((data.healthy / totalClients) * 100) : 0;

  // Transform data for pie chart
  const chartData = [
    { status: "healthy", count: data.healthy, fill: "var(--color-healthy)" },
    { status: "warning", count: data.warning, fill: "var(--color-warning)" },
    { status: "atRisk", count: data.atRisk, fill: "var(--color-atRisk)" },
  ].filter((item) => item.count > 0);

  // If no data, show placeholder
  if (chartData.length === 0) {
    chartData.push(
      { status: "healthy", count: 5, fill: "var(--color-healthy)" },
      { status: "warning", count: 2, fill: "var(--color-warning)" },
      { status: "atRisk", count: 1, fill: "var(--color-atRisk)" }
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Client Health</CardTitle>
        <CardDescription>Activity-based health score</CardDescription>
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
            <Pie data={chartData} dataKey="count" nameKey="status">
              <LabelList
                dataKey="status"
                className="fill-background"
                stroke="none"
                fontSize={11}
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
          <Users className="h-4 w-4" />
          {healthyPercent}% healthy
        </div>
        <div className="leading-none text-muted-foreground">
          {totalClients > 0 ? `${totalClients} active clients` : "Sample data"}
        </div>
      </CardFooter>
    </Card>
  );
}
