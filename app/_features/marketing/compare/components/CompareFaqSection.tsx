"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { CompareFaqItem } from "../types";

type CompareFaqSectionProps = {
  items: CompareFaqItem[];
  heading?: string;
  className?: string;
};

export function CompareFaqSection({
  items,
  heading = "Frequently asked questions",
  className,
}: CompareFaqSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "compare-faq-section w-full min-w-0 space-y-5 pt-8 pb-0 sm:space-y-8 sm:pt-12 lg:pt-14",
        className,
      )}
      aria-labelledby="compare-faq-heading"
    >
      <div className="text-center pb-2 sm:pb-4">
        <h2
          id="compare-faq-heading"
          className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
        >
          {heading}
        </h2>
      </div>
      <Accordion
        type="single"
        collapsible
        className="flex w-full flex-col rounded-2xl border border-foreground/10 bg-card px-1"
      >
        {items.map((item, index) => (
          <AccordionItem
            key={item.question}
            value={`faq-${index}`}
            className="border-foreground/10 px-4 last:border-b-0 sm:px-5"
          >
            <AccordionTrigger className="py-3.5 text-left text-[15px] font-medium leading-snug break-words hover:no-underline sm:py-4 sm:text-base">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
