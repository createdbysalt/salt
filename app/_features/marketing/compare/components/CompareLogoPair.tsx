import { Briefcase } from "lucide-react";
import { cn } from "@repo/utils";
import {
  getCompareCompetitor,
  getCompareCompetitorLogoCandidates,
  getCompareCompetitorLogoDomains,
  type CompareCompetitor,
} from "../compare-competitors";
import { CompareBrandLogo } from "./CompareBrandLogo";

type CompareLogoPairProps = {
  competitorSlug?: string;
  size?: "sm" | "md";
  className?: string;
};

function LogoTile({
  competitor,
  size,
}: {
  competitor: CompareCompetitor;
  size: "sm" | "md";
}) {
  const maxHeight = size === "sm" ? "max-h-9" : "max-h-11";
  const boxSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const domains = getCompareCompetitorLogoDomains(competitor);

  if (domains.length > 0) {
    return (
      <CompareBrandLogo
        candidates={getCompareCompetitorLogoCandidates(competitor, "article-mark")}
        alt={`${competitor.name} logo`}
        wrapperClassName={cn("flex shrink-0 items-center justify-center", boxSize)}
        imgClassName={cn(maxHeight, "w-auto max-w-full object-contain object-center")}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground",
        size === "sm" ? "size-9" : "size-11"
      )}
      aria-hidden
    >
      {competitor.name.slice(0, 1)}
    </div>
  );
}

export function CompareLogoPair({
  competitorSlug,
  size = "md",
  className,
}: CompareLogoPairProps) {
  const salt = getCompareCompetitor("salt");
  const competitor = competitorSlug
    ? getCompareCompetitor(competitorSlug)
    : undefined;

  if (!salt) {
    return null;
  }

  if (!competitor) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <LogoTile competitor={salt} size={size} />
        <Briefcase
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "size-8" : "size-10"
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      <LogoTile competitor={salt} size={size} />
      <span
        className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        aria-hidden
      >
        vs
      </span>
      <LogoTile competitor={competitor} size={size} />
    </div>
  );
}
