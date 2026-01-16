import * as React from "react";
import { cn } from "@repo/utils";

interface RadialRing {
  value: number; // 0-100
  color?: string;
  label?: string;
  radius?: number;
}

interface RadialGaugeProps {
  /**
   * For single ring mode, provide just value and color
   */
  value?: number;
  color?: string;
  /**
   * For multi-ring mode, provide an array of rings
   */
  rings?: RadialRing[];
  /**
   * Size of the gauge (width/height)
   */
  size?: number;
  /**
   * Thickness of each ring
   */
  thickness?: number;
  /**
   * Gap between rings (for multi-ring)
   */
  ringGap?: number;
  /**
   * Start angle in degrees (0 = top, 90 = right, etc.)
   */
  startAngle?: number;
  /**
   * End angle in degrees
   */
  endAngle?: number;
  /**
   * Track opacity (background ring)
   */
  trackOpacity?: number;
  /**
   * Show center label (for single ring)
   */
  showCenterLabel?: boolean;
  /**
   * Show ring labels (for multi-ring)
   */
  showRingLabels?: boolean;
  className?: string;
}

/**
 * RadialGauge - Circular progress gauge with rounded caps
 * Supports single-ring (Activity) and multi-ring (Skill) modes
 */
export function RadialGauge({
  value,
  color = "rgb(var(--chart-2))",
  rings,
  size = 200,
  thickness = 12,
  ringGap = 8,
  startAngle = -90,
  endAngle = 270,
  trackOpacity = 0.15,
  showCenterLabel = true,
  showRingLabels = true,
  className,
}: RadialGaugeProps) {
  const center = size / 2;
  const isSingleRing = !rings;

  // Convert degrees to radians
  const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

  // Calculate arc path
  const describeArc = (radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = degreesToRadians(angleInDegrees);
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Single ring mode
  if (isSingleRing && value !== undefined) {
    const radius = (size / 2) - (thickness / 2) - 4;
    const progressEndAngle = startAngle + ((endAngle - startAngle) * value) / 100;

    return (
      <div className={cn("relative inline-flex items-center justify-center", className)}>
        <svg width={size} height={size}>
          {/* Track (background ring) */}
          <path
            d={describeArc(radius, startAngle, endAngle)}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            opacity={trackOpacity}
          />
          {/* Progress ring */}
          <path
            d={describeArc(radius, startAngle, progressEndAngle)}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {showCenterLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold">{value}%</span>
          </div>
        )}
      </div>
    );
  }

  // Multi-ring mode
  if (rings) {
    const baseRadius = (size / 2) - (thickness / 2) - 4;

    return (
      <div className={cn("relative", className)}>
        <div className="inline-flex items-center justify-center">
          <svg width={size} height={size}>
            {rings.map((ring, index) => {
              const radius = baseRadius - (index * (thickness + ringGap));
              const ringColor = ring.color || color;
              const progressEndAngle = startAngle + ((endAngle - startAngle) * ring.value) / 100;

              return (
                <g key={index}>
                  {/* Track */}
                  <path
                    d={describeArc(radius, startAngle, endAngle)}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    opacity={trackOpacity}
                  />
                  {/* Progress */}
                  <path
                    d={describeArc(radius, startAngle, progressEndAngle)}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </g>
              );
            })}
          </svg>
          {showCenterLabel && rings[0] && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold">{rings[0].value}%</span>
            </div>
          )}
        </div>

        {/* Ring labels */}
        {showRingLabels && (
          <div className="mt-4 space-y-1">
            {rings.map((ring, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ring.color || color }}
                  />
                  <span className="opacity-60">{ring.label}</span>
                </div>
                <span className="font-medium">{ring.value}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}






