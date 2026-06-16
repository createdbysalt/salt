import type { CompareHiddenCostsConfig } from "../types";

type CompareHiddenCostsSectionProps = {
  hiddenCosts: CompareHiddenCostsConfig;
};

export function CompareHiddenCostsSection({ hiddenCosts }: CompareHiddenCostsSectionProps) {
  if (hiddenCosts.items.length === 0) {
    return null;
  }

  const heading = hiddenCosts.heading ?? "Hidden costs";

  return (
    <section
      className="compare-hidden-costs rounded-2xl bg-foreground/[0.03] px-6 py-10 sm:rounded-3xl sm:px-8 sm:py-12 lg:px-10 lg:py-14 xl:px-14 xl:py-16"
      aria-labelledby="compare-hidden-costs-heading"
    >
      <h2
        id="compare-hidden-costs-heading"
        className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl"
      >
        {heading}
      </h2>

      <ol className="compare-hidden-costs__list mt-10 list-none space-y-8 p-0 sm:mt-12 sm:space-y-9">
        {hiddenCosts.items.map((item, index) => (
          <li key={item.title}>
            <p className="text-[15px] leading-[1.75] text-foreground sm:text-base sm:leading-[1.8]">
              <strong className="font-semibold text-foreground">
                {index + 1}. {item.title}:
              </strong>{" "}
              {item.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
