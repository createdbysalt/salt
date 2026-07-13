"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@repo/utils";

type PlaysTabEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName?: string;
  iconWrapClassName?: string;
  className?: string;
  animate?: boolean;
};

export function PlaysTabEmptyState({
  icon: Icon,
  title,
  description,
  iconClassName,
  iconWrapClassName,
  className,
  animate = true,
}: PlaysTabEmptyStateProps) {
  const content = (
    <div
      className={cn(
        "glass-card rounded-3xl px-8 py-14 text-center sm:px-10 sm:py-16",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-muted/80",
          iconWrapClassName,
        )}
      >
        <Icon
          className={cn("size-5 text-muted-foreground", iconClassName)}
          strokeWidth={2}
        />
      </div>
      <p className="font-display text-2xl tracking-tight text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}
