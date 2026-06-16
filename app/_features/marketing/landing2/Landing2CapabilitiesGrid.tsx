"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LandingCapabilityCard } from "@/app/_lib/sanity/types";
import {
  CAPABILITY_VISUALS,
  isCapabilityVisualKey,
} from "./capability-visuals";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const TILE_VARIANTS = {
  hidden: { opacity: 1, y: 14 },
  visible: { opacity: 1, y: 0 },
  hover: { y: -2 },
} as const;

const TILE_ARROW_VARIANTS = {
  visible: { x: 0, scale: 1 },
  hover: {
    x: 5,
    scale: 1.2,
    transition: { type: "spring", stiffness: 480, damping: 14, mass: 0.55 },
  },
} as const;

function FeatureTile({
  card,
  index,
}: {
  card: LandingCapabilityCard;
  index: number;
}) {
  const reduce = useReducedMotion();
  const Visual = isCapabilityVisualKey(card.visualKey)
    ? CAPABILITY_VISUALS[card.visualKey]
    : CAPABILITY_VISUALS.integrations;

  return (
    <motion.article
      variants={TILE_VARIANTS}
      initial={false}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: APPLE_EASE, delay: index * 0.06 }}
      whileHover={reduce ? undefined : "hover"}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-muted p-6 pb-7 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-7 sm:pb-8"
    >
      <h3 className="text-xl font-medium leading-snug tracking-tight sm:text-[25px]">
        {card.title}
      </h3>
      <p className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
        {card.label}
        <motion.span
          aria-hidden
          variants={reduce ? undefined : TILE_ARROW_VARIANTS}
          className="inline-block origin-center leading-none"
        >
          →
        </motion.span>
      </p>
      <div className="relative mt-auto flex min-h-[200px] flex-1 flex-col pt-7 sm:pt-8">
        <Visual />
      </div>
    </motion.article>
  );
}

export function Landing2CapabilitiesGrid({
  cards,
}: {
  cards: LandingCapabilityCard[];
}) {
  return (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-14 lg:grid-cols-3">
      {cards.map((card, i) => (
        <FeatureTile key={card._id} card={card} index={i} />
      ))}
    </div>
  );
}
