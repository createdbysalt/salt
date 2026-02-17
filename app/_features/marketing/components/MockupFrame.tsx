"use client";

import { cn } from "@repo/utils";

interface MockupFrameProps {
  children: React.ReactNode;
  className?: string;
  /** Apply 3D perspective tilt (hero-style). Default: false */
  perspective?: boolean;
}

/**
 * macOS-style window frame for product mockups.
 * Glass border, traffic light dots, subtle inner shadow.
 */
export function MockupFrame({
  children,
  className,
  perspective = false,
}: MockupFrameProps) {
  return (
    <div
      className={cn(
        "relative",
        perspective && "perspective-wrapper",
        className
      )}
      style={
        perspective
          ? {
              perspective: "1200px",
              perspectiveOrigin: "50% 30%",
            }
          : undefined
      }
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/[0.08]",
          "bg-[rgb(14,15,16)]",
          perspective && "mockup-tilt"
        )}
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
          ...(perspective
            ? {
                transform: "rotateX(8deg) rotateY(-2deg) scale(0.95)",
                transformOrigin: "50% 0%",
              }
            : {}),
        }}
      >
        {/* Title bar */}
        <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.06] px-3.5">
          <span className="h-[10px] w-[10px] rounded-full bg-white/[0.12]" />
          <span className="h-[10px] w-[10px] rounded-full bg-white/[0.08]" />
          <span className="h-[10px] w-[10px] rounded-full bg-white/[0.08]" />
        </div>

        {/* Content */}
        <div className="relative">{children}</div>

        {/* Subtle gradient overlay for depth */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.3) 100%)",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
