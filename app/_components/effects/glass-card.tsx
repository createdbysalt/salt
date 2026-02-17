"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";
import { useAnimationTier } from "@/app/_lib/animations/hooks";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Enable hover glow intensification on desktop. Default: true */
  hoverGlow?: boolean;
  /** Enable the inset glow shadow. Default: true */
  insetGlow?: boolean;
}

/**
 * Glass-effect card extracted from Raycast's design system.
 * Features:
 * - 134deg gradient overlay (white 8% → 2% → transparent)
 * - Inset glow shadow (double inset for depth)
 * - Hover: border brightens + subtle lift (desktop only)
 */
export function GlassCard({
  children,
  className,
  hoverGlow = true,
  insetGlow = true,
}: GlassCardProps) {
  const tier = useAnimationTier();

  const baseStyles = cn(
    "relative overflow-hidden rounded-2xl",
    "border border-white/[0.08]",
    "bg-[rgb(20,21,22)]",
    className
  );

  if (tier === "none") {
    return (
      <div className={baseStyles} style={insetGlow ? glassStyles : undefined}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={baseStyles}
      style={insetGlow ? glassStyles : undefined}
      whileHover={
        hoverGlow && tier === "full"
          ? {
              borderColor: "rgba(255, 255, 255, 0.15)",
              y: -4,
            }
          : undefined
      }
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(134deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02), transparent 55%)",
        }}
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

const glassStyles: React.CSSProperties = {
  boxShadow:
    "rgba(255,255,255,0.04) 0px 1.5px 5.26px 0px inset, rgba(255,255,255,0.1) 0px -0.75px 0.75px 0px inset",
};
