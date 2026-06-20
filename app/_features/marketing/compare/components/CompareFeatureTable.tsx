import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@repo/ui";
import type { CompareTableRow } from "../types";
import { getCompareCompetitor } from "../compare-competitors";

type CompareFeatureTableProps = {
  competitorLabel: string;
  competitorSlug?: string;
  rows: CompareTableRow[];
};

function HeaderBrandWordmark({
  name,
  variant,
}: {
  name: string;
  variant: "salt" | "competitor";
}) {
  const className =
    variant === "salt"
      ? "font-display text-xl font-semibold leading-none tracking-tight text-foreground sm:text-[1.75rem] lg:text-[2rem]"
      : "font-display text-base font-semibold leading-none tracking-tight text-foreground sm:text-lg lg:text-xl";

  return <span className={className}>{name}</span>;
}

export function CompareFeatureTable({
  competitorLabel,
  competitorSlug,
  rows,
}: CompareFeatureTableProps) {
  const saltName = getCompareCompetitor("salt")?.name ?? "Salt";
  const competitor = competitorSlug ? getCompareCompetitor(competitorSlug) : undefined;
  const competitorName = competitor?.name ?? competitorLabel;
  return (
    <section
      className="compare-feature-table space-y-6 pt-8 sm:space-y-10 sm:pt-12 lg:space-y-12 lg:pt-14"
      aria-labelledby="compare-feature-table-heading"
    >
      <div className="text-center pb-2 sm:pb-4">
        <h2
          id="compare-feature-table-heading"
          className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
        >
          Feature comparison
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:mt-3 sm:text-[15px]">
          Side by side on what matters for independent professionals.
        </p>
      </div>

      <div className="compare-feature-table__wrap -mx-1 px-1 sm:mx-0 sm:px-0">
        <table className="compare-feature-table__grid w-full min-w-[min(100%,520px)] text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="compare-feature-table__feature px-5 py-5 text-left text-xs font-bold uppercase tracking-wide text-foreground sm:px-6"
              >
                Features
              </th>
              <th
                scope="col"
                className="compare-feature-table__salt px-5 py-5 text-center sm:px-6"
              >
                <HeaderBrandWordmark name={saltName} variant="salt" />
              </th>
              <th
                scope="col"
                className="compare-feature-table__competitor px-5 py-5 text-center sm:px-6"
              >
                <HeaderBrandWordmark name={competitorName} variant="competitor" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className="compare-feature-table__feature px-5 py-4 text-left text-[15px] font-medium text-foreground sm:px-6 sm:py-[1.125rem]"
                >
                  {row.label}
                </th>
                <td className="compare-feature-table__salt px-5 py-4 text-center text-[15px] font-medium leading-snug text-foreground sm:px-6 sm:py-[1.125rem]">
                  {row.saltValue}
                </td>
                <td className="compare-feature-table__competitor px-5 py-4 text-center text-[15px] leading-snug text-muted-foreground sm:px-6 sm:py-[1.125rem]">
                  {row.competitorValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center pt-2 sm:pt-4">
        <Button asChild size="lg" className="w-full px-6 sm:w-auto">
          <Link href="#waitlist" className="inline-flex items-center gap-2">
            Join the waitlist
            <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
