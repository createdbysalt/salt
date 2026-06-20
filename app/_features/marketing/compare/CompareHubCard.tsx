import Link from "next/link";
import { Briefcase, LayoutGrid } from "lucide-react";
import { cn } from "@repo/utils";
import type { CompareHubEntry } from "./compare-pages";
import { getCompareArticleHref } from "./compare-pages";
import {
  getCompareCompetitor,
  getCompareCompetitorLogoCandidates,
  getCompareCompetitorLogoDomains,
} from "./compare-competitors";
import { CompareBrandLogo } from "./components/CompareBrandLogo";

function HubCardLogo({ entry }: { entry: CompareHubEntry }) {
  if (entry.competitorSlug) {
    const competitor = getCompareCompetitor(entry.competitorSlug);
    const domains = competitor ? getCompareCompetitorLogoDomains(competitor) : [];

    if (competitor && domains.length > 0) {
      return (
        <CompareBrandLogo
          candidates={getCompareCompetitorLogoCandidates(competitor, "hub-mark")}
          fallbackLabel={competitor.name}
          wrapperClassName="flex h-12 w-full items-center justify-center sm:h-16"
          imgClassName="max-h-12 w-auto max-w-[7.5rem] object-contain object-center sm:max-h-16 sm:max-w-[9.5rem]"
        />
      );
    }
  }

  const iconClass = "size-10 text-muted-foreground/70 sm:size-14";

  if (entry.slug === "salt-vs-hiring-a-va") {
    return <Briefcase className={iconClass} strokeWidth={1.5} aria-hidden />;
  }
  if (entry.slug === "salt-alternatives") {
    return <LayoutGrid className={iconClass} strokeWidth={1.5} aria-hidden />;
  }

  return (
    <span className="text-2xl font-semibold text-muted-foreground/60" aria-hidden>
      {entry.label.slice(0, 1)}
    </span>
  );
}

export function CompareHubCard({ entry }: { entry: CompareHubEntry }) {
  const href = getCompareArticleHref(entry.slug);
  const title = entry.kind === "versus" ? entry.label : entry.label;

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full min-h-[112px] flex-col items-center justify-center rounded-xl border border-foreground/10 bg-card px-3 py-6 sm:min-h-[140px] sm:px-6 sm:py-10",
        "transition hover:border-foreground/20 hover:bg-foreground/[0.02]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
      )}
    >
      <HubCardLogo entry={entry} />
      <p className="mt-3 text-center text-sm font-medium leading-snug text-foreground sm:mt-5 sm:text-[15px]">
        {title}
      </p>
      <span className="sr-only">
        {entry.kind === "versus" ? `Salt vs ${entry.label}` : entry.label}
      </span>
    </Link>
  );
}
