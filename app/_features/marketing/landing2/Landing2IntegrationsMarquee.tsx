"use client";

import { FAMOUS_COMPOSIO_BRANDS } from "./composioBrandIcons";
import { Landing2Container } from "./Landing2Container";

const integrations = FAMOUS_COMPOSIO_BRANDS.map(({ Icon, label }) => ({ Icon, label }));

function MarqueeRow({ reverse }: { reverse?: boolean }) {
  const items = [...integrations, ...integrations];
  return (
    <div className="overflow-hidden">
      <div
        className={`flex w-max gap-3 ${reverse ? "[animation-direction:reverse]" : ""} animate-marquee hover:[animation-play-state:paused]`}
      >
        {items.map(({ Icon, label }, i) => (
          <div
            key={`${label}-${i}`}
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-foreground/10 bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            title={label}
          >
            <Icon className="size-6 text-foreground/80" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Landing2IntegrationsMarquee() {
  return (
    <section id="integrations" className="scroll-mt-28 border-y border-foreground/10 bg-card/40 py-14 lg:py-16">
      <Landing2Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Integrations
            </p>
            <h2 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
              Keep everything in sync automatically.
            </h2>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Salt connects to the tools you already use — no manual entry required.
          </p>
        </div>
        <div className="mt-10 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <MarqueeRow />
        </div>
      </Landing2Container>
    </section>
  );
}
