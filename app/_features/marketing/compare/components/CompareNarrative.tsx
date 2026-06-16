import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { CompareNarrativeFeatureVisual } from "./CompareNarrativeFeatureVisual";
import type {
  CompareNarrativeBlock,
  CompareNarrativeClosing,
  CompareNarrativeConfig,
  CompareNarrativeFeatureBlock,
  CompareNarrativePoint,
} from "../types";

function NarrativePoint({ point }: { point: CompareNarrativePoint }) {
  return (
    <div className="space-y-2">
      <p className="text-[15px] font-semibold leading-snug text-foreground sm:text-base">
        {point.lead}
      </p>
      <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base sm:leading-[1.75]">
        {point.body}
      </p>
    </div>
  );
}

function NarrativeFeatureRow({
  block,
  index,
}: {
  block: CompareNarrativeFeatureBlock;
  index: number;
}) {
  const placement = block.visualPlacement ?? (index % 2 === 0 ? "right" : "left");
  const visualOnLeft = placement === "left";

  return (
    <section className="compare-narrative__feature grid min-w-0 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-16">
      <div className={cn("min-w-0 space-y-6 sm:space-y-7", visualOnLeft && "lg:order-2")}>
        <h3 className="text-balance font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-[2rem] lg:leading-[1.15]">
          {block.title}
        </h3>
        <div className="space-y-6 sm:space-y-7">
          {block.points.map((point) => (
            <NarrativePoint key={point.lead} point={point} />
          ))}
        </div>
      </div>

      <div className={cn("min-w-0", visualOnLeft && "lg:order-1")}>
        <CompareNarrativeFeatureVisual visual={block.visual} accent={block.accent} />
      </div>
    </section>
  );
}

function NarrativeParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base sm:leading-[1.75]">
      {children}
    </p>
  );
}

function NarrativeClosingBlocks({ blocks }: { blocks: CompareNarrativeBlock[] }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      {blocks.map((block, index) => {
        if (block.type !== "paragraph") {
          return null;
        }
        return <NarrativeParagraph key={`p-${index}`}>{block.content}</NarrativeParagraph>;
      })}
    </div>
  );
}

function NarrativeClosing({ closing }: { closing: CompareNarrativeClosing }) {
  return (
    <section className="compare-narrative__closing space-y-5 border-t border-foreground/10 pt-10 sm:space-y-8 sm:pt-16">
      <h2 className="text-balance font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
        {closing.title}
      </h2>
      <NarrativeClosingBlocks blocks={closing.blocks} />
      {closing.cta ? (
        <div className="flex w-full flex-col items-stretch gap-3 pt-1 pb-6 sm:items-start sm:pb-10 sm:pt-2">
          {closing.caption ? (
            <p className="text-sm text-muted-foreground">{closing.caption}</p>
          ) : null}
          <Button asChild size="lg" className="w-full px-6 sm:w-auto">
            <Link href={closing.cta.href} className="inline-flex items-center gap-2">
              {closing.cta.label}
              <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function CompareNarrative({ narrative }: { narrative: CompareNarrativeConfig }) {
  return (
    <article className="compare-narrative w-full min-w-0 space-y-12 pt-8 sm:space-y-16 sm:pt-10 lg:space-y-20 lg:pt-14">
      <header className="compare-narrative__intro w-full space-y-3 sm:space-y-4">
        <h2 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl sm:text-4xl lg:text-[2.5rem] lg:leading-[1.12]">
          {narrative.intro.title}
        </h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base sm:leading-[1.75]">
          {narrative.intro.subtitle}
        </p>
      </header>

      {narrative.featureBlocks.length > 0 ? (
        <div className="compare-narrative__features space-y-12 sm:space-y-16 lg:space-y-24">
          {narrative.featureBlocks.map((block, index) => (
            <NarrativeFeatureRow key={block.title} block={block} index={index} />
          ))}
        </div>
      ) : null}

      <NarrativeClosing closing={narrative.closing} />
    </article>
  );
}
