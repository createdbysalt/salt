"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@repo/utils";
import {
  CapabilityPlaysVisual,
  ConnectToolsPickVisual,
  SaltMorningVisual,
} from "@/app/_features/marketing/landing2/Landing2VisualMocks";
import type { CompareNarrativeMockVisualKey, CompareNarrativeVisual } from "../types";

const MOCKS: Record<CompareNarrativeMockVisualKey, () => ReactNode> = {
  plays: () => <CapabilityPlaysVisual />,
  connect: () => <ConnectToolsPickVisual />,
  morning: () => <SaltMorningVisual />,
};

const ACCENT_CLASS = {
  sky: "bg-[color-mix(in_oklab,var(--sky)_24%,var(--background))]",
  violet: "bg-[color-mix(in_oklab,var(--violet)_20%,var(--background))]",
  blush: "bg-[color-mix(in_oklab,var(--blush)_22%,var(--background))]",
} as const;

type CompareNarrativeFeatureVisualProps = {
  visual: CompareNarrativeVisual;
  accent?: keyof typeof ACCENT_CLASS;
};

export function CompareNarrativeFeatureVisual({
  visual,
  accent = "sky",
}: CompareNarrativeFeatureVisualProps) {
  const isScreenshot = visual.kind === "screenshot";

  return (
    <figure
      className={cn(
        "compare-narrative__visual-shell m-0 flex w-full min-w-0 flex-col items-center justify-center rounded-2xl p-4 sm:rounded-[1.75rem] sm:p-6 sm:min-h-[280px] lg:p-8 lg:min-h-[320px]",
        ACCENT_CLASS[accent],
      )}
    >
      <div
        className={cn(
          "w-full max-w-full overflow-hidden rounded-xl border border-foreground/12 bg-background shadow-[0_18px_40px_-28px_rgba(39,37,30,0.35)] sm:rounded-2xl",
          isScreenshot ? "p-0" : "compare-narrative__mock-scale p-3 sm:p-4 lg:p-6",
        )}
      >
        {isScreenshot ? (
          <Image
            src={visual.src}
            alt={visual.alt}
            width={3314}
            height={1756}
            className="h-auto w-full max-w-full"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 560px"
          />
        ) : (
          (() => {
            const Mock = MOCKS[visual.key];
            return <Mock />;
          })()
        )}
      </div>
      {isScreenshot && visual.caption ? (
        <figcaption className="mt-2 max-w-md px-1 text-center text-[11px] leading-relaxed text-muted-foreground sm:mt-3 sm:px-0 sm:text-xs lg:text-[13px]">
          {visual.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
