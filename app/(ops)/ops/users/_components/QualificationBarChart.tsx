"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@repo/ui";
import type { KeyCount } from "@/app/_features/admin/queries";

const chartConfig = {
  count: {
    label: "Leads",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function QualificationBarChart({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: KeyCount[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No answers yet.</p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[220px] w-full"
          >
            <BarChart data={rows} layout="vertical" accessibilityLayer>
              <XAxis type="number" hide />
              <YAxis
                dataKey="key"
                type="category"
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                <LabelList
                  dataKey="count"
                  position="right"
                  className="fill-foreground"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
