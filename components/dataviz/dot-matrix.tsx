import * as React from "react";
import { cn } from "@/libs/cn";

interface DotMatrixProps {
  /**
   * Binary values for each dot (0 = off, 1 = on)
   * Array length should equal columns * rows
   */
  values: number[];
  columns?: number;
  rows?: number;
  onColor?: string;
  offColor?: string;
  dotSize?: string;
  dotGap?: string;
  showXAxis?: boolean;
  xAxisLabels?: string[];
  className?: string;
}

/**
 * DotMatrix - Binary grid visualization (like conversion rate card)
 * Each dot represents a binary state (on/off) in a calendar-like grid
 */
export function DotMatrix({
  values,
  columns = 30,
  rows = 6,
  onColor = "rgb(var(--dv-dot-on))",
  offColor = "rgb(var(--dv-dot-off))",
  dotSize = "var(--dv-dot-size)",
  dotGap = "var(--dv-dot-gap)",
  showXAxis = true,
  xAxisLabels,
  className,
}: DotMatrixProps) {
  // Generate default x-axis labels if not provided (01, 05, 10, 15, 20, 25, 30)
  const defaultLabels = Array.from({ length: columns }, (_, i) => {
    const num = i + 1;
    return num === 1 || num % 5 === 0 ? num.toString().padStart(2, "0") : "";
  });

  const labels = xAxisLabels || defaultLabels;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Dot grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${dotSize})`,
          gridTemplateRows: `repeat(${rows}, ${dotSize})`,
          gap: dotGap,
        }}
      >
        {values.map((value, index) => (
          <div
            key={index}
            className="rounded-full transition-colors duration-200"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: value === 1 ? onColor : offColor,
            }}
          />
        ))}
      </div>

      {/* X-axis labels */}
      {showXAxis && (
        <div
          className="grid text-[10px] font-medium opacity-40"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${dotSize})`,
            gap: dotGap,
          }}
        >
          {labels.map((label, index) => (
            <div key={index} className="text-center">
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to generate sample dot matrix data
 */
export function generateDotMatrixData(
  columns: number,
  rows: number,
  fillPercentage: number = 0.7
): number[] {
  const total = columns * rows;
  return Array.from({ length: total }, () => 
    Math.random() < fillPercentage ? 1 : 0
  );
}



