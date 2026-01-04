import * as React from "react";
import { cn } from "@/libs/cn";

interface MiniBarsProps {
  /**
   * Data points for the bars
   */
  data: number[];
  /**
   * Color of the bars (can be CSS var or color)
   */
  color?: string;
  /**
   * Maximum value for scaling (auto-calculates if not provided)
   */
  maxValue?: number;
  /**
   * Height of the chart container
   */
  height?: number;
  /**
   * Width of each bar
   */
  barWidth?: number;
  /**
   * Gap between bars
   */
  barGap?: number;
  /**
   * Border radius for bar caps
   */
  barRadius?: number;
  /**
   * Show x-axis labels
   */
  xAxisLabels?: string[];
  className?: string;
}

/**
 * MiniBars - Minimal sparkline bar chart (like Achievement/Growth cards)
 * Thin vertical bars with rounded tops, no axes or grid
 */
export function MiniBars({
  data,
  color = "rgb(var(--chart-2))",
  maxValue,
  height = 120,
  barWidth = 12,
  barGap = 6,
  barRadius = 8,
  xAxisLabels,
  className,
}: MiniBarsProps) {
  const max = maxValue || Math.max(...data);
  const chartWidth = data.length * (barWidth + barGap) - barGap;

  return (
    <div className={cn("space-y-2", className)}>
      <svg
        width={chartWidth}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="overflow-visible"
      >
        {data.map((value, index) => {
          const barHeight = (value / max) * height;
          const x = index * (barWidth + barGap);
          const y = height - barHeight;

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={barRadius}
              ry={barRadius}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>

      {/* Optional x-axis labels */}
      {xAxisLabels && (
        <div className="flex justify-between text-[10px] font-medium opacity-60">
          {xAxisLabels.map((label, index) => (
            <div key={index} style={{ width: barWidth }}>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to generate sample mini bar data
 */
export function generateMiniBarData(count: number, min: number = 50, max: number = 250): number[] {
  return Array.from({ length: count }, () => 
    Math.floor(Math.random() * (max - min + 1)) + min
  );
}




