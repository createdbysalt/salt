"use client";

import { Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@repo/ui";
import type { KeyCount } from "@/app/_features/admin/queries";

const SLICE_COLORS = [
  "var(--primary)",
  "var(--muted-foreground)",
  "var(--chart-3, var(--secondary-foreground))",
  "var(--chart-4, var(--accent-foreground))",
];

export function PlanMixChart({
  rows,
  title = "Plan mix",
  description = "Workspaces by tier",
}: {
  rows: KeyCount[];
  title?: string;
  description?: string;
}) {
  const config = {
    count: { label: "Count" },
    ...Object.fromEntries(
      rows.map((row, index) => [
        slugKey(row.key),
        {
          label: row.key,
          color: SLICE_COLORS[index % SLICE_COLORS.length],
        },
      ]),
    ),
  } satisfies ChartConfig;

  const data = rows.map((row) => ({
    name: slugKey(row.key),
    count: row.count,
    fill: `var(--color-${slugKey(row.key)})`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <ChartContainer config={config} className="mx-auto h-[220px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius={50}
                strokeWidth={2}
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function slugKey(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return slug.length > 0 ? slug : "other";
}
