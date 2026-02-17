"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { WordReveal } from "@/app/_components/effects/word-reveal";
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { GlowBorder } from "@/app/_components/effects/glow-border";
import { GridPattern } from "@/app/_components/effects/grid-pattern";
import { MagneticHover } from "@/app/_components/effects/magnetic-hover";
import { DashboardMockup } from "./DashboardMockup";

/**
 * Animated hero section — Linear-inspired.
 * Left-aligned headline + CTA, then a massive full-width
 * product mockup on a 3D diagonal below.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* ─── Background layers ─── */}

      {/* Subtle radial glow behind hero text — monochrome */}
      <div
        className="pointer-events-none absolute left-1/3 top-[20%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
        style={{
          width: "min(900px, 90vw)",
          height: "min(600px, 60vw)",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* Dot grid — desktop only */}
      <GridPattern
        dotColor="rgba(255,255,255,0.07)"
        gap={28}
        dotSize={1}
      />

      {/* ─── Hero text content — left-aligned like Linear ─── */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 md:pt-40">
        {/* Origin proof */}
        <FadeUpBlur delay={0.1}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="text-[12px] font-medium tracking-[0.02em] text-[rgb(138,143,152)]">
              Built by a studio, for studios
            </span>
          </div>
        </FadeUpBlur>

        {/* Headline — word-by-word blur reveal, left-aligned */}
        <WordReveal
          text="Build and run your studio."
          as="h1"
          className="max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.06] tracking-[-0.022em] text-[#F7F8F8]"
          delay={0.3}
        />

        {/* Subtitle */}
        <FadeUpBlur delay={0.9} className="mt-5">
          <p className="max-w-xl text-[clamp(1rem,1.8vw,1.125rem)] leading-relaxed text-[rgb(138,143,152)]">
            Strategic intelligence. Professional delivery.{" "}
            <span className="text-[rgb(200,204,210)]">
              Client experience you control.
            </span>
          </p>
        </FadeUpBlur>

        {/* CTA */}
        <FadeUpBlur delay={1.3} className="mt-10">
          <div className="inline-block">
            <MagneticHover maxTranslate={4} maxRotate={0.5}>
              <GlowBorder duration={4} rounded="rounded-full">
                <Link
                  href="#waitlist"
                  className="group relative inline-flex items-center gap-2 rounded-full bg-[rgb(8,9,10)] px-7 py-3.5 text-[15px] font-medium text-[#F7F8F8] transition-colors"
                >
                  Join the waitlist
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </GlowBorder>
            </MagneticHover>
          </div>
        </FadeUpBlur>
      </div>

      {/* ─── Product mockup — single unified window, wide but contained ─── */}
      <div className="relative z-10 mx-auto mt-16 max-w-7xl px-6 md:mt-20">
        <DashboardMockup />
      </div>

      {/* Bottom fade — tall aggressive gradient for smooth transition */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-[500px]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(8,9,10,0.35) 20%, rgba(8,9,10,0.7) 40%, rgba(8,9,10,0.92) 60%, rgb(8,9,10) 75%)",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
