import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@repo/ui";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { CompareHeroWorkspacePreview } from "./CompareHeroWorkspacePreview";
import type { CompareHeroConfig } from "../types";

type CompareDetailHeroProps = {
  hero: CompareHeroConfig;
};

export function CompareDetailHero({ hero }: CompareDetailHeroProps) {
  return (
    <section className="compare-detail-hero border-b border-foreground/8 pb-16 pt-14 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      <Landing2Container>
        <div className="grid items-center gap-8 pt-6 sm:gap-10 sm:pt-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.22fr)] lg:gap-10 lg:pt-12 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] xl:gap-12">
          <div className="max-w-xl">
            <h1 className="font-display text-balance text-[2rem] leading-[1.08] tracking-[-0.03em] sm:text-[40px] sm:leading-[1.1] lg:text-[44px]">
              {hero.headline}
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {hero.thesis}
            </p>

            {hero.bullets.length > 0 ? (
              <ul className="mt-6 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-x-6">
                {hero.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm sm:text-[15px]">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06]">
                      <Check className="size-3 text-foreground/70" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span className="leading-snug text-foreground/85">{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8">
              <Button asChild size="lg" className="w-full px-6 sm:w-auto">
                <Link href="#waitlist">Join the waitlist</Link>
              </Button>
            </div>
          </div>

          <div className="relative w-full min-w-0 lg:mx-0">
            <CompareHeroWorkspacePreview />
          </div>
        </div>
      </Landing2Container>
    </section>
  );
}
