"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { cn } from "@repo/utils";

/**
 * Animated text shimmer for streaming/thinking states.
 * Adapted from vercel/chatbot ai-elements/shimmer.tsx for Salt tokens.
 */
export type ShimmerProps = {
  children: string;
  className?: string;
  duration?: number;
  spread?: number;
};

function ShimmerComponent({
  children,
  className,
  duration = 2,
  spread = 2,
}: ShimmerProps) {
  const dynamicSpread = React.useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread],
  );

  return (
    <motion.span
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--muted-foreground), var(--muted-foreground))",
        } as React.CSSProperties
      }
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </motion.span>
  );
}

export const Shimmer = React.memo(ShimmerComponent);
