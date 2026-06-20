"use client";

import type { HomepageContent } from "@/app/_lib/sanity/types";
import type { ResolvedWaitlistForm } from "@/app/_features/marketing/waitlist-form-config";
import { WaitlistForm } from "./WaitlistForm";
import {
  landing2FrameClass,
  landing2GutterClass,
  landing2HeroCopyClass,
  landing2HeroPreviewClass,
} from "./landing2-layout";
import { HeroPreviewVisual } from "./HeroPreviewVisual";
import { HOMEPAGE_CONTENT_FALLBACK } from "./homepage-content-fallback";
import { resolveHeroShowPreview } from "./resolve-hero-show-preview";

type Landing2HeroProps = {
  content?: HomepageContent;
  waitlistForm: ResolvedWaitlistForm;
  /** When set, overrides homepageContent.heroShowPreview */
  showPreview?: boolean;
};

export function Landing2Hero({
  content = HOMEPAGE_CONTENT_FALLBACK,
  waitlistForm,
  showPreview,
}: Landing2HeroProps) {
  const badge = content.heroBadge?.trim();
  const headline = content.heroHeadline ?? HOMEPAGE_CONTENT_FALLBACK.heroHeadline!;
  const subheadline =
    content.heroSubheadline ?? HOMEPAGE_CONTENT_FALLBACK.heroSubheadline!;
  const waitlistSource =
    content.heroWaitlistSource ?? HOMEPAGE_CONTENT_FALLBACK.heroWaitlistSource!;
  const microline = content.heroMicroline?.trim();
  const previewVisible =
    showPreview ?? resolveHeroShowPreview(content);

  return (
    <section className={previewVisible ? "relative pb-24" : "relative pb-16 lg:pb-20"}>
      {previewVisible ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 z-[1] h-56 w-full"
          style={{
            background:
              "linear-gradient(to top, var(--background) 15%, transparent 100%)",
          }}
        />
      ) : null}

      <div className={`${landing2GutterClass} relative z-10 pt-4 sm:pt-8 lg:pt-10`}>
        <div className={landing2FrameClass}>
          <div className={`${landing2HeroCopyClass} text-center`}>
            {badge ? (
              <div className="mt-4 flex justify-center sm:mt-12">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.04] px-3 py-1 text-xs font-medium text-foreground/65 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm sm:text-foreground/70">
                  <span className="size-1.5 shrink-0 rounded-full bg-sky" />
                  {badge}
                </span>
              </div>
            ) : null}

            <h1
              className={`font-display mx-auto max-w-[16ch] text-balance text-[2rem] leading-[1.08] tracking-[-0.03em] sm:max-w-[22ch] sm:text-[44px] sm:leading-[1.1] sm:tracking-tight lg:text-[56px] xl:text-[60px] ${badge ? "mt-4 sm:mt-5" : "mt-4 sm:mt-12"}`}
            >
              {headline}
            </h1>

            <p className="mx-auto mt-4 max-w-[34ch] text-[15px] leading-[1.65] text-muted-foreground sm:mt-6 sm:max-w-[52ch] sm:text-lg sm:leading-relaxed">
              {subheadline}
            </p>

            <div className="mx-auto mt-6 flex w-full max-w-[17.5rem] flex-col items-center sm:mt-8 sm:max-w-[520px]">
              <WaitlistForm
                source={waitlistSource}
                submitLabel={waitlistForm.submitLabel}
                emailPlaceholder={waitlistForm.emailPlaceholder}
                compactMobile
              />
            </div>

            {microline ? (
              <p className="mx-auto mt-4 max-w-[40ch] text-xs leading-relaxed text-muted-foreground/80 sm:mt-5 sm:max-w-[48ch] sm:text-sm">
                {microline}
              </p>
            ) : null}
          </div>

          {previewVisible ? (
            <div className={`${landing2HeroPreviewClass} mt-8 sm:mt-12`}>
              <HeroPreviewVisual visualKey={content.heroPreviewVisualKey} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
