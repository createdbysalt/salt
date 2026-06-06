"use client";

import { WaitlistForm } from "./WaitlistForm";
import {
  landing2FrameClass,
  landing2GutterClass,
  landing2HeroCopyClass,
  landing2HeroPreviewClass,
} from "./landing2-layout";
import { Landing2HeroWorkspacePreview } from "./Landing2HeroWorkspacePreview";

export function Landing2Hero() {
  return (
    <section className="relative pb-24">
      {/* Bottom gradient — fades dots into the screenshot below */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 z-[1] h-56 w-full"
        style={{
          background:
            "linear-gradient(to top, var(--background) 15%, transparent 100%)",
        }}
      />

      <div className={`${landing2GutterClass} relative z-10 pt-4 sm:pt-8 lg:pt-10`}>
        <div className={landing2FrameClass}>
          <div className={`${landing2HeroCopyClass} text-center`}>
            <div className="mt-4 flex justify-center sm:mt-12">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.04] px-3 py-1 text-xs font-medium text-foreground/65 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm sm:text-foreground/70">
                <span className="size-1.5 shrink-0 rounded-full bg-sky" />
                Proactive AI for your business
              </span>
            </div>

            <h1 className="font-display mx-auto mt-4 max-w-[16ch] text-balance text-[2rem] leading-[1.08] tracking-[-0.03em] sm:mt-5 sm:max-w-[22ch] sm:text-[44px] sm:leading-[1.1] sm:tracking-tight lg:text-[56px] xl:text-[60px]">
              You can clock out, Salt never sleeps
            </h1>

            <p className="mx-auto mt-4 max-w-[34ch] text-[15px] leading-[1.65] text-muted-foreground sm:mt-6 sm:max-w-[52ch] sm:text-lg sm:leading-relaxed">
              Salt reads every tool your business runs on. It surfaces what needs you, automates what
              doesn&apos;t, and gets better over time.
            </p>

            <div className="mx-auto mt-6 flex w-full max-w-[17.5rem] flex-col items-center sm:mt-8 sm:max-w-[520px]">
              <WaitlistForm source="landing2-hero" compactMobile />
            </div>
          </div>

          <div className={`${landing2HeroPreviewClass} mt-8 sm:mt-12`}>
            <Landing2HeroWorkspacePreview />
          </div>
        </div>
      </div>
    </section>
  );
}
