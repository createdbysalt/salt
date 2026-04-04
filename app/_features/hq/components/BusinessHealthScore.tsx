"use client";

import { RadialBar, RadialBarChart, PolarRadiusAxis, PolarGrid, Label } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartContainer,
} from "@repo/ui";
import type { ChartConfig } from "@repo/ui";
import type { BusinessHealthScore as BusinessHealthScoreData } from "@/app/actions/insights/get-hq-insights";

interface BusinessHealthScoreProps {
  data: BusinessHealthScoreData;
}

const chartConfig = {
  health: {
    label: "Health",
    color: "hsl(0 0% 100%)",
  },
} satisfies ChartConfig;

function getHealthLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}

function getHealthColor(score: number): string {
  if (score >= 80) return "hsl(0 0% 100%)";
  if (score >= 60) return "hsl(0 0% 80%)";
  if (score >= 40) return "hsl(0 0% 60%)";
  return "hsl(0 0% 45%)";
}

export function BusinessHealthScore({ data }: BusinessHealthScoreProps) {
  const chartData = [
    {
      name: "health",
      value: data.overall,
      fill: getHealthColor(data.overall),
    },
  ];

  const healthLabel = getHealthLabel(data.overall);
  const isGood = data.overall >= 60;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle>Business Health</CardTitle>
        <CardDescription>Overall studio performance score</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={(data.overall / 100) * 360}
            innerRadius={80}
            outerRadius={90}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[90, 80]}
            />
            <RadialBar dataKey="value" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {data.overall}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {healthLabel}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none">
          {isGood ? "Business is healthy" : "Areas need attention"}
          {isGood ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
        </div>
        <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground w-full max-w-xs">
          <div className="text-center">
            <div className="font-medium text-foreground">{data.revenue}</div>
            <div>Revenue</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{data.clients}</div>
            <div>Clients</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{data.delivery}</div>
            <div>Delivery</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{data.pipeline}</div>
            <div>Pipeline</div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
