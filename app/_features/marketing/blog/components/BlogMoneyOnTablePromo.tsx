import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function BlogMoneyOnTablePromo() {
  return (
    <div className="mt-8 rounded-xl border border-foreground/10 bg-card px-4 py-4 sm:mt-10 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-6 lg:mt-12">
      <p className="text-sm leading-snug sm:text-base lg:text-lg">
        <span
          className="mr-3 font-semibold sm:mr-4"
          style={{
            backgroundImage: "var(--gradient-aurora)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Money on the table
        </span>
        <span className="text-muted-foreground">
          Find revenue you&apos;re leaving behind.
        </span>
      </p>
      <Link
        href="/money-on-the-table?source=blog"
        className="group mt-4 inline-flex shrink-0 items-center gap-1 text-sm font-medium underline underline-offset-4 transition hover:text-foreground/80 sm:mt-0"
      >
        Take the quiz
        <ArrowUpRight
          className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          strokeWidth={2.25}
          aria-hidden
        />
      </Link>
    </div>
  );
}
