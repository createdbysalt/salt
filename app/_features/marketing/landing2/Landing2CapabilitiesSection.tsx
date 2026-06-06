"use client";

import type { ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Landing2Container } from "./Landing2Container";
import { Landing2SectionHeader } from "./Landing2SectionHeader";
import {
  CapabilityIntelligenceVisual,
  CapabilityPlaybooksVisual,
  CapabilityPlaysVisual,
  CaptureMemoryVisual,
  ConnectToolsPickVisual,
  TodayBriefVisual,
} from "./Landing2VisualMocks";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const TILE_VARIANTS = {
  hidden: { opacity: 0, y: 14 },
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

type CapabilityTile = {
  title: string;
  ctaLabel: string;
  href: string;
  Visual: ComponentType;
};

export const CAPABILITY_TILES: CapabilityTile[] = [
  {
    title: "Connect the tools your business already runs on.",
    ctaLabel: "Integrations",
    href: "#product",
    Visual: ConnectToolsPickVisual,
  },
  {
    title: "Catch context as it happens. Salt files it for you.",
    ctaLabel: "Capture & Memory",
    href: "#product",
    Visual: CaptureMemoryVisual,
  },
  {
    title: "Start every morning oriented. Not catching up.",
    ctaLabel: "Morning Brief",
    href: "#product",
    Visual: TodayBriefVisual,
  },
  {
    title: "Skip the blank draft. Salt prepares, you approve.",
    ctaLabel: "Plays",
    href: "#product",
    Visual: CapabilityPlaysVisual,
  },
  {
    title: "Know what's going quiet before it costs you.",
    ctaLabel: "Intelligence",
    href: "#product",
    Visual: CapabilityIntelligenceVisual,
  },
  {
    title: "Build Playbooks once. Salt runs them from there.",
    ctaLabel: "Playbooks",
    href: "#product",
    Visual: CapabilityPlaybooksVisual,
  },
];

function FeatureTile({
  tile,
  index,
}: {
  tile: CapabilityTile;
  index: number;
}) {
  const reduce = useReducedMotion();
  const { Visual } = tile;

  return (
    <motion.article
      variants={TILE_VARIANTS}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: APPLE_EASE, delay: index * 0.06 }}
      whileHover={reduce ? undefined : "hover"}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-muted p-6 pb-7 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-7 sm:pb-8"
    >
      <h3 className="text-xl font-medium leading-snug tracking-tight sm:text-[25px]">
        {tile.title}
      </h3>
      <a
        href={tile.href}
        className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-foreground"
      >
        {tile.ctaLabel}
        <motion.span
          aria-hidden
          variants={reduce ? undefined : TILE_ARROW_VARIANTS}
          className="inline-block origin-center leading-none"
        >
          →
        </motion.span>
      </a>
      <div className="relative mt-auto flex min-h-[200px] flex-1 flex-col pt-7 sm:pt-8">
        <Visual />
      </div>
    </motion.article>
  );
}

export function Landing2CapabilitiesSection() {
  return (
    <section id="product" className="scroll-mt-20 py-20 lg:py-28">
      <Landing2Container>
        <Landing2SectionHeader
          eyebrow="Product"
          title="Salt runs the work. You run the business."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:mt-14">
          {CAPABILITY_TILES.map((tile, i) => (
            <FeatureTile key={tile.title} tile={tile} index={i} />
          ))}
        </div>
      </Landing2Container>
    </section>
  );
}
