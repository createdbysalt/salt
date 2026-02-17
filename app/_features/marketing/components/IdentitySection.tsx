"use client";

import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { WordReveal } from "@/app/_components/effects/word-reveal";

/**
 * Identity transformation section — emotional narrative about the
 * designer/developer/business owner identity crisis.
 * Minimal chrome, lets the typography breathe. Inspired by Linear's
 * editorial text-only sections.
 */
export function IdentitySection() {
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

      <div className="mx-auto max-w-3xl px-6 text-center">
        <WordReveal
          text={'From "designer who codes" to strategic studio owner.'}
          as="h2"
          className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#F7F8F8]"
        />

        <FadeUpBlur delay={0.4} className="mt-8">
          <p className="text-[16px] leading-relaxed text-[rgb(138,143,152)]">
            You&apos;ve got three competing identities: designer, developer,
            business owner. Salt Core unifies them. Whether you&apos;re writing
            TypeScript or prompting Cursor, you&apos;re running a studio that
            delivers measurable results.
          </p>
        </FadeUpBlur>

        <FadeUpBlur delay={0.6} className="mt-6">
          <p className="text-[17px] font-medium leading-relaxed text-[rgb(200,204,210)]">
            The code ships. The clients pay. That&apos;s what makes it real.
          </p>
        </FadeUpBlur>
      </div>
    </section>
  );
}
