"use client";

import * as React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps {
  data: any[];
  bars: Array<{
    dataKey: string;
    name?: string;
    fill?: string;
  }>;
  xAxisKey: string;
  height?: number;
  className?: string;
  /**
   * Chart variant style
   * - "default": Standard chart with grid and legend
   * - "bento": Minimal style with no grid/legend for bento tiles
   */
  variant?: "default" | "bento";
}

/**
 * BarChart wrapper with premium Vercel-like styling
 * Uses ultra-subtle grid and muted palette tokens
 * Supports "bento" variant for minimal dashboard tiles
 */
export function BarChart({
  data,
  bars,
  xAxisKey,
  height = 300,
  className,
  variant = "default",
}: BarChartProps) {
  const isBento = variant === "bento";

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          barGap={isBento ? 8 : 4}
          barCategoryGap={isBento ? "20%" : "10%"}
        >
          {!isBento && (
            <CartesianGrid
              strokeDasharray="0"
              stroke="var(--border)"
              vertical={false}
              strokeOpacity={0.5}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            stroke="var(--muted-foreground)"
            fontSize={isBento ? 10 : 11}
            tickLine={false}
            axisLine={false}
            dy={10}
            hide={isBento}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={isBento ? 10 : 11}
            tickLine={false}
            axisLine={false}
            dx={-10}
            hide={isBento}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            labelStyle={{
              color: "var(--foreground)",
              fontWeight: 600,
              marginBottom: "4px",
            }}
            cursor={{ fill: "var(--muted)", opacity: 0.1 }}
          />
          {!isBento && (
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                paddingTop: "20px",
              }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {bars.map((bar, index) => {
            // LAYER 2: Multi-color palette for data clarity
            const defaultFills = [
              "var(--chart-1)", // Emerald
              "var(--chart-2)", // Blue
              "var(--chart-3)", // Orange
              "var(--chart-4)", // Lime
              "var(--chart-5)", // Violet
            ];
            
            return (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name || bar.dataKey}
                fill={bar.fill || defaultFills[index % defaultFills.length]}
                radius={isBento ? [8, 8, 0, 0] : [6, 6, 0, 0]}
              />
            );
          })}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

