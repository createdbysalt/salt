"use client";

import * as React from "react";
import { cn } from "@repo/utils";
import { cva, type VariantProps } from "class-variance-authority";

const AI_COLOR = "#4e58fc";

const aiButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-1.5 font-normal bg-card cursor-pointer hover:opacity-80 transition-opacity",
  {
    variants: {
      variant: {
        default: "rounded-lg",
        header: "rounded-lg",
        icon: "rounded-full",
      },
      size: {
        default: "px-4 py-2 text-[13px]",
        sm: "px-3 py-1.5 text-[11px]",
        header: "h-8 px-3 text-sm",
        icon: "size-9",
        "icon-sm": "size-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AIButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof aiButtonVariants> {
  asChild?: boolean;
}

/**
 * AIButton - Button with rotating gradient border for AI-powered actions.
 *
 * Use this for any button that triggers AI functionality:
 * - Quick capture
 * - Draft reply
 * - Generate summary
 * - Ask Salt
 * - Extract insights
 *
 * The rotating gradient border is the visual signature for AI-powered actions,
 * creating cohesion with the AI processing indicator.
 */
const AIButton = React.forwardRef<HTMLButtonElement, AIButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    const isIcon = variant === "icon";
    const isHeader = variant === "header";
    const effectiveSize = isIcon ? (size === "sm" ? "icon-sm" : "icon") : (isHeader ? "header" : size);

    // Determine border radius for gradient wrapper
    const gradientRadius = isIcon ? "rounded-full" : "rounded-lg";

    return (
      <div className="relative inline-flex cursor-pointer">
        {/* Rotating gradient border - subtle variant for buttons */}
        <div
          className={cn(
            "absolute inset-0 ai-gradient-glow-subtle",
            gradientRadius
          )}
        />
        {/* Button content */}
        <button
          ref={ref}
          className={cn(aiButtonVariants({ variant, size: effectiveSize }), className)}
          style={{
            color: AI_COLOR,
            margin: "1.5px",
          }}
          {...props}
        >
          {children}
        </button>
      </div>
    );
  }
);
AIButton.displayName = "AIButton";

export { AIButton, aiButtonVariants };
