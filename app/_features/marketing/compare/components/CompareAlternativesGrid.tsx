import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CompareAlternativesGridConfig } from "../types";

type CompareAlternativesGridProps = {
  grid: CompareAlternativesGridConfig;
};

export function CompareAlternativesGrid({ grid }: CompareAlternativesGridProps) {
  if (grid.entries.length === 0) {
    return null;
  }

  const heading = grid.heading ?? "Your real alternatives";

  return (
    <section
      className="compare-alternatives-grid rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-6 py-10 sm:rounded-3xl sm:px-8 sm:py-12 lg:px-10 lg:py-14"
      aria-labelledby="compare-alternatives-grid-heading"
    >
      <h2
        id="compare-alternatives-grid-heading"
        className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl"
      >
        {heading}
      </h2>

      {grid.intro ? (
        <p className="mt-4 max-w-[65ch] text-[15px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-base sm:leading-[1.75]">
          {grid.intro}
        </p>
      ) : null}

      <ul className="mt-10 list-none space-y-6 p-0 sm:mt-12 sm:space-y-8">
        {grid.entries.map((entry) => (
          <li
            key={entry.title}
            className="rounded-xl border border-foreground/10 bg-background px-5 py-6 sm:px-6 sm:py-7"
          >
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {entry.title}
            </h3>
            <div className="mt-4 space-y-4">
              <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base sm:leading-[1.75]">
                <strong className="font-semibold text-foreground">What they do well:</strong>{" "}
                {entry.strengths}
              </p>
              <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base sm:leading-[1.75]">
                <strong className="font-semibold text-foreground">The gap:</strong> {entry.gap}
              </p>
            </div>
            {entry.cta ? (
              <Link
                href={entry.cta.href}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:text-foreground/80"
              >
                {entry.cta.label}
                <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
