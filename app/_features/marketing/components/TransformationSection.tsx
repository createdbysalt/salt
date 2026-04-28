"use client";

import { motion } from "framer-motion";
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { useAnimationTier } from "@/app/_lib/animations/hooks";
import { DURATION, STAGGER } from "@/app/_lib/animations/easings";

const BEFORE = [
  "\u201CDesigner who codes\u201D",
  "Competing on price",
  "Proposals in Google Docs",
  "30% win rate",
  "$3\u20135k one-time projects",
] as const;

const AFTER = [
  "Strategic studio owner",
  "Competing on intelligence",
  "Branded portal + strategic reports",
  "60\u201375% win rate",
  "$8\u201312k projects + retainers",
] as const;

/**
 * Before/After transformation section with visual mockups.
 * Each column gets a mini UI illustration above the text list.
 */
export function TransformationSection() {
  const tier = useAnimationTier();

  return (
    <section className="relative py-28 md:py-36">
      {/* Subtle top divider */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.06) 50%, transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl px-6">
        <FadeUpBlur>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#F7F8F8]">
              From one-time projects
              <br />
              <span className="text-[rgb(138,143,152)]">
                to strategic partnerships
              </span>
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[rgb(138,143,152)]">
              Stop competing on price. Start competing on intelligence.
            </p>
          </div>
        </FadeUpBlur>

        {/* Before / After columns with visual mockups */}
        <FadeUpBlur delay={0.2} className="mt-16">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            <div className="grid sm:grid-cols-2">
              {/* Before */}
              <div className="relative border-b border-white/[0.06] sm:border-b-0 sm:border-r">
                {/* Cluttered tools mockup */}
                <BeforeMockup />

                <div className="p-8 pt-0">
                  <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[rgb(100,105,114)]">
                    Before
                  </span>
                  <ul className="mt-5 space-y-3.5">
                    {BEFORE.map((item, i) => (
                      <motion.li
                        key={item}
                        className="flex items-center gap-3 text-[14px] text-[rgb(100,105,114)]"
                        initial={
                          tier !== "none"
                            ? { opacity: 0, x: -12 }
                            : undefined
                        }
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          delay: 0.4 + i * STAGGER.fast,
                          duration: DURATION.medium,
                          ease: [0.23, 1, 0.32, 1],
                        }}
                      >
                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                        <span className="line-through decoration-white/10">
                          {item}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* After */}
              <div className="relative">
                {/* Clean SALT mockup */}
                <AfterMockup />

                <div className="p-8 pt-0">
                  <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[rgb(180,185,192)]">
                    After
                  </span>
                  <ul className="mt-5 space-y-3.5">
                    {AFTER.map((item, i) => (
                      <motion.li
                        key={item}
                        className="flex items-center gap-3 text-[14px] font-medium text-[#F7F8F8]"
                        initial={
                          tier !== "none"
                            ? { opacity: 0, x: 12 }
                            : undefined
                        }
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          delay: 0.5 + i * STAGGER.fast,
                          duration: DURATION.medium,
                          ease: [0.23, 1, 0.32, 1],
                        }}
                      >
                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </FadeUpBlur>
      </div>
    </section>
  );
}

/** Messy multi-tab browser mockup — shows the chaos of scattered tools */
function BeforeMockup() {
  return (
    <div className="p-6 pb-5 sm:p-8 sm:pb-5">
      <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
        {/* Browser-like tab bar with too many tabs */}
        <div className="flex items-center gap-0 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="border-r border-white/[0.06] px-3 py-2 text-[9px] text-white/40">
            Notion - CRM
          </div>
          <div className="border-r border-white/[0.06] px-3 py-2 text-[9px] text-white/25">
            Google Docs
          </div>
          <div className="border-r border-white/[0.06] px-3 py-2 text-[9px] text-white/25">
            Stripe
          </div>
          <div className="border-r border-white/[0.06] px-3 py-2 text-[9px] text-white/15">
            Figma
          </div>
          <div className="px-3 py-2 text-[9px] text-white/10">
            +4
          </div>
        </div>
        {/* Content area — messy spreadsheet feel */}
        <div className="p-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 rounded-full bg-white/[0.08]" />
              <div className="h-1.5 w-14 rounded-full bg-white/[0.05]" />
              <div className="h-1.5 w-10 rounded-full bg-white/[0.04]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full bg-white/[0.06]" />
              <div className="h-1.5 w-24 rounded-full bg-white/[0.04]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-28 rounded-full bg-white/[0.05]" />
              <div className="h-1.5 w-8 rounded-full bg-white/[0.03]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clean SALT dashboard mini-mockup — shows unified experience */
function AfterMockup() {
  return (
    <div className="p-6 pb-5 sm:p-8 sm:pb-5">
      <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
        {/* Clean header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-4 w-4 items-center justify-center rounded bg-white/[0.1]">
              <span className="text-[7px] font-bold text-white/60">S</span>
            </div>
            <span className="text-[10px] font-medium text-white/50">
              SALT
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <span className="text-[9px] text-white/30">All synced</span>
          </div>
        </div>
        {/* Organized content */}
        <div className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <div className="h-1.5 w-24 rounded-full bg-white/[0.12]" />
              </div>
              <div className="h-1.5 w-10 rounded-full bg-white/[0.08]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                <div className="h-1.5 w-20 rounded-full bg-white/[0.1]" />
              </div>
              <div className="h-1.5 w-12 rounded-full bg-white/[0.06]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-white/25" />
                <div className="h-1.5 w-28 rounded-full bg-white/[0.08]" />
              </div>
              <div className="h-1.5 w-8 rounded-full bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
