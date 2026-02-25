"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SparklineChartProps {
  data: Array<{ value: number; label?: string }>;
  color?: string;
  height?: number;
  showTooltip?: boolean;
  className?: string;
  /** Gradient fill from color to transparent */
  gradient?: boolean;
}

/**
 * SparklineChart - Minimal inline chart for metric cards
 *
 * Usage:
 * <SparklineChart
 *   data={[{ value: 100 }, { value: 120 }, { value: 90 }, { value: 150 }]}
 *   color="var(--chart-1)"
 *   height={40}
 * />
 */
export function SparklineChart({
  data,
  color = "var(--chart-1)",
  height = 40,
  showTooltip = true,
  className,
  gradient = true,
}: SparklineChartProps) {
  const gradientId = React.useId().replace(/:/g, "");

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            {gradient && (
              <linearGradient id={`sparkline-gradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
                padding: "6px 10px",
              }}
              labelStyle={{ display: "none" }}
              formatter={(value: number) => [value.toLocaleString(), ""]}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={gradient ? `url(#sparkline-gradient-${gradientId})` : "transparent"}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
