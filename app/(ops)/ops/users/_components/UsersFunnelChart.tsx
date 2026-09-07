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
import type { UsersFunnel } from "@/app/_features/admin/queries";

const chartConfig = {
  count: {
    label: "Accounts",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function UsersFunnelChart({ funnel }: { funnel: UsersFunnel }) {
  const data = [
    { stage: "Signed up", count: funnel.signedUp },
    { stage: "On trial", count: funnel.trial },
    { stage: "Paid", count: funnel.paid },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
        <CardDescription>Signed up → trial → paid</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={data} layout="vertical" accessibilityLayer>
            <XAxis type="number" hide />
            <YAxis
              dataKey="stage"
              type="category"
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4}>
              <LabelList dataKey="count" position="right" className="fill-foreground" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
