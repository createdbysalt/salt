"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";

export type BlogFaqItem = {
  question: string;
  answer: string;
};

type BlogArticleFaqProps = {
  items: BlogFaqItem[];
  heading?: string;
};

export function BlogArticleFaq({
  items,
  heading = "Frequently asked questions",
}: BlogArticleFaqProps) {
  if (!items.length) return null;

  return (
    <section
      className="blog-article-faq mb-10 w-full space-y-4"
      aria-labelledby="blog-article-faq-heading"
    >
      <h2
        id="blog-article-faq-heading"
        className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
      >
        {heading}
      </h2>
      <Accordion
        type="single"
        collapsible
        className="rounded-2xl border border-foreground/10 bg-card px-1"
      >
        {items.map((item, index) => (
          <AccordionItem
            key={item.question}
            value={`blog-faq-${index}`}
            className="border-foreground/10 px-4 last:border-b-0"
          >
            <AccordionTrigger className="py-3.5 text-left text-[15px] font-medium leading-snug hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
