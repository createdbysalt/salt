"use client";

import * as React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type LineProps,
} from "recharts";

interface LineChartProps {
  data: any[];
  lines: Array<{
    dataKey: string;
    name?: string;
    stroke?: string;
    strokeWidth?: number;
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
 * LineChart wrapper with premium Vercel-like styling
 * Uses ultra-subtle grid and cyan accent for clean data visualization
 * Supports "bento" variant for minimal dashboard tiles
 */
export function LineChart({
  data,
  lines,
  xAxisKey,
  height = 300,
  className,
  variant = "bento",
}: LineChartProps) {
  const isBento = variant === "bento";

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {!isBento && (
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgb(var(--chart-grid))"
              vertical={false}
              strokeOpacity={0.5}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            stroke="rgb(var(--muted-foreground))"
            fontSize={isBento ? 10 : 11}
            tickLine={false}
            axisLine={false}
            dy={10}
            hide={isBento}
          />
          <YAxis
            stroke="rgb(var(--muted-foreground))"
            fontSize={isBento ? 10 : 11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            dx={-10}
            hide={isBento}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(var(--popover))",
              border: "1px solid rgb(var(--border))",
              borderRadius: "12px",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            labelStyle={{
              color: "rgb(var(--foreground))",
              fontWeight: 600,
              marginBottom: "4px",
            }}
            itemStyle={{
              color: "rgb(var(--muted-foreground))",
              padding: "2px 0",
            }}
            cursor={{ stroke: "rgb(var(--border))", strokeWidth: 1 }}
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
          {lines.map((line, index) => {
            // LAYER 2: Multi-color palette for data clarity
            const defaultStrokes = [
              "rgb(var(--chart-1))", // Emerald
              "rgb(var(--chart-2))", // Blue
              "rgb(var(--chart-3))", // Orange
              "rgb(var(--chart-4))", // Lime
              "rgb(var(--chart-5))", // Violet
            ];
            
            return (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.stroke || defaultStrokes[index % defaultStrokes.length]}
                strokeWidth={line.strokeWidth || (isBento ? 3 : 2)}
                dot={isBento ? false : { r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

