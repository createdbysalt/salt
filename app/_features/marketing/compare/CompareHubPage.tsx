import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import { Landing2WaitlistSection } from "@/app/_features/marketing/landing2/Landing2WaitlistSection";
import "@/app/_features/marketing/landing2/landing2.css";
import { CompareHubCard } from "./CompareHubCard";
import type { CompareHubEntry } from "./compare-pages";

type CompareHubPageProps = {
  entries: CompareHubEntry[];
};

export function CompareHubPage({ entries }: CompareHubPageProps) {
  return (
    <div className="landing2-home">
      <main className="min-h-screen bg-background">
        <Landing2NavServer />

        <section className="pb-12 pt-10 sm:pb-20 sm:pt-16 lg:pt-20">
          <Landing2Container>
            <div className="text-center">
              <h1 className="font-display text-balance text-[1.75rem] leading-[1.12] tracking-[-0.03em] sm:text-[2.75rem] sm:leading-[1.1] lg:text-[3.25rem]">
                Salt vs...
              </h1>
              <p className="mx-auto mt-3 max-w-md px-2 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:px-0 sm:text-base">
                Find out how Salt compares to other tools.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3 md:mt-12 md:gap-4">
              {entries.map((entry) => (
                <div
                  key={entry.slug}
                  className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] lg:max-w-[260px]"
                >
                  <CompareHubCard entry={entry} />
                </div>
              ))}
            </div>
          </Landing2Container>
        </section>

        <Landing2WaitlistSection />
      </main>
      <Landing2FooterServer />
    </div>
  );
}
