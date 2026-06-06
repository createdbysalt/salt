"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function Landing2SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  const centered = align === "center";

  return (
    <motion.div
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: APPLE_EASE }}
      className={centered ? "mx-auto text-center" : undefined}
    >
      <div className={centered ? "flex items-center justify-center gap-2" : "flex items-center gap-2"}>
        <span className="size-1.5 shrink-0 rounded-full bg-sky" />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </span>
      </div>
      <h2 className="font-display mt-3 text-balance text-3xl leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
      ) : null}
    </motion.div>
  );
}
