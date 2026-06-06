"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Landing2Container } from "./Landing2Container";
import { Landing2SectionHeader } from "./Landing2SectionHeader";
import { PlaysBreadthVisual } from "./Landing2VisualMocks";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const features = [
  {
    title: "Plays across every app you use",
    body: "Invoices, kickoffs, scope replies, onboarding steps — Salt prepares the action in the right tool and queues it for your approval. You never start from a blank draft.",
    accent: "bg-flame/15 border-flame/30",
    dot: "bg-flame",
    visual: <PlaysBreadthVisual />,
  },
  {
    title: "Growth direction, mapped and prepared",
    body: "Set where you want to go. Salt surfaces what changed, maps the plan, and prepares automatable steps — so the longer it runs, the more it shows you what to do next.",
    accent: "bg-blush/15 border-blush/30",
    dot: "bg-blush",
    visual: (
      <div className="relative flex h-full min-h-[140px] items-end gap-1 p-4 pt-8">
        {[40, 55, 48, 72, 68, 85].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-blush/40 to-flame/50"
            style={{ height: `${h}%` }}
          />
        ))}
        <TrendingUp className="absolute right-6 top-6 size-4 text-blush" />
      </div>
    ),
  },
];

export function Landing2FeaturesSection() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="scroll-mt-28 py-20 lg:py-28">
      <Landing2Container>
        <Landing2SectionHeader
          eyebrow="Go deeper"
          title="More room to grow — same hours, more capacity."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: APPLE_EASE, delay: i * 0.08 }}
              whileHover={reduce ? undefined : { y: -4 }}
              className={`relative overflow-hidden rounded-2xl border transition-shadow hover:shadow-[var(--shadow-lift)] ${f.accent}`}
            >
              <div className="relative min-h-[140px] border-b border-foreground/5 bg-gradient-to-br from-card/60 to-transparent">
                {f.visual}
              </div>
              <div className="p-7">
                <span className={`inline-block size-2 rounded-full ${f.dot}`} />
                <h3 className="font-display mt-4 text-2xl leading-tight">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Landing2Container>
    </section>
  );
}
