import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";

export function BlogComparePromo() {
  return (
    <Landing2Container>
      <div className="surface-aurora relative overflow-hidden rounded-2xl px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-white/90" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
                Compare
              </span>
            </div>
            <h2 className="font-display text-balance text-2xl leading-tight tracking-[-0.03em] text-white sm:text-3xl">
              See how Salt stacks up against the tools you already know
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
              Honest side-by-side guides for Lindy, ChatGPT, hiring a VA, and more.
            </p>
          </div>
          <Link
            href="/compare"
            className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-foreground transition hover:bg-white/90"
          >
            Explore comparisons
            <ArrowUpRight
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={2.25}
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </Landing2Container>
  );
}
