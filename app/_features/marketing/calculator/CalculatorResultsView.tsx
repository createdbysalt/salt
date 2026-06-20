"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/utils";
import {
  formatMoney,
  formatMoneyRounded,
  type CalculatorLeak,
  type CalculatorMathLine,
  type CalculatorResult,
} from "./money-on-the-table-math";

const LEAK_MATH_LABEL: Record<string, string> = {
  "Inquiries that went cold": "Inquiries that went cold: ",
  "Proposals nobody followed up on": "Silent proposals: ",
  "Admin hours at your hourly value": "Admin hours: ",
};

function getLeakMathDetail(
  leak: CalculatorLeak,
  mathLines: CalculatorMathLine[]
): string {
  if (leak.mathDetail.trim()) {
    return leak.mathDetail;
  }

  const prefix = LEAK_MATH_LABEL[leak.name];
  if (!prefix) {
    return "";
  }

  const line = mathLines.find((entry) => entry.label === prefix);
  return line ? `${line.label}${line.detail}` : "";
}

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const STAGGER = 0.08;

function AnimatedMoneyAmount({
  value,
  className,
  delay = 0,
}: {
  value: number;
  className?: string;
  delay?: number;
}) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => formatMoney(v));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.35,
      ease: APPLE_EASE,
      delay,
    });
    return () => controls.stop();
  }, [value, delay, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
}

function AnimatedMoneyRange({
  low,
  high,
  className,
}: {
  low: number;
  high: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1",
        className
      )}
    >
      <AnimatedMoneyAmount value={low} delay={0.15} />
      <span className="text-white/50">–</span>
      <AnimatedMoneyAmount value={high} delay={0.3} />
    </div>
  );
}

function LeakRow({
  leak,
  mathLines,
  maxAmount,
  index,
}: {
  leak: CalculatorResult["leaks"][number];
  mathLines: CalculatorMathLine[];
  maxAmount: number;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const mathDetail = getLeakMathDetail(leak, mathLines);
  const share = maxAmount > 0 ? Math.max(8, (leak.amount / maxAmount) * 100) : 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: APPLE_EASE, delay: 0.45 + index * STAGGER }}
      className="rounded-[16px] border border-foreground/8 bg-card shadow-[var(--shadow-card)] sm:rounded-[20px]"
    >
      <div className="p-4 sm:p-5 md:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-foreground/6 bg-foreground/[0.03] text-lg sm:size-11 sm:rounded-2xl sm:text-xl"
            aria-hidden
          >
            {leak.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-semibold leading-snug sm:text-[15.5px] md:text-base">
              {leak.name}
            </h3>
            <p className="font-display mt-1.5 text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-[#00614A] sm:mt-2 sm:text-[1.5rem] md:text-[1.75rem]">
              ~{formatMoneyRounded(leak.amount)}
              <span className="ml-1 text-sm font-medium text-muted-foreground sm:text-base md:text-lg">
                /yr
              </span>
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-[13.5px]">
              {leak.why}
            </p>
            <div
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]"
              role="presentation"
            >
              <motion.div
                className="h-full rounded-full surface-aurora"
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{
                  duration: 0.9,
                  ease: APPLE_EASE,
                  delay: 0.55 + index * STAGGER,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-foreground/8 bg-foreground/[0.02]">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-xs font-medium text-foreground/80 transition-colors hover:text-foreground sm:px-5 sm:py-3.5 sm:text-[13px] md:px-6"
        >
          How we calculated this
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="math-detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: APPLE_EASE }}
              className="overflow-hidden border-t border-foreground/6"
            >
              <p className="break-words px-4 py-3.5 text-[13px] leading-relaxed text-foreground/80 sm:px-5 sm:py-4 sm:text-sm md:px-6">
                {mathDetail}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

type CalculatorResultsViewProps = {
  result: CalculatorResult;
  alreadyOnWaitlist: boolean;
};

export function CalculatorResultsView({
  result,
  alreadyOnWaitlist,
}: CalculatorResultsViewProps) {
  const maxLeak = Math.max(...result.leaks.map((leak) => leak.amount), 1);
  const rangeLine = result.mathLines.find((line) => line.label.startsWith("The range"));
  const benchmarkLine = result.mathLines.find((line) =>
    line.label.startsWith("Benchmarks")
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: APPLE_EASE }}
        className="surface-aurora relative overflow-hidden rounded-[20px] px-5 py-10 text-center text-white shadow-[var(--shadow-lift)] sm:rounded-[24px] sm:px-8 sm:py-12 md:rounded-[28px] md:px-10 md:py-14"
      >
        <div className="relative z-10">
          <span
            className="chip border-white/20 bg-white/15 text-[11px] text-white/90 backdrop-blur sm:text-xs"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
          >
            Your estimate
          </span>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 sm:mt-6 sm:text-[11px]">
            Money on the table
          </p>

          <AnimatedMoneyRange
            low={result.rangeLow}
            high={result.rangeHigh}
            className="font-display mt-2.5 text-[clamp(1.65rem,7.5vw,4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-white sm:mt-3"
          />

          <p className="mx-auto mt-2.5 max-w-sm px-1 text-sm leading-relaxed text-white/80 sm:mt-3 sm:px-0 sm:text-[15px]">
            per year, for a business like yours
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: APPLE_EASE, delay: 0.25 }}
        className="mt-6 sm:mt-8 md:mt-10"
      >
        <div className="mb-4 sm:mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground sm:text-[11px]">
            Breakdown
          </p>
          <h2 className="font-display mt-1 text-lg font-semibold tracking-[-0.02em] sm:text-xl md:text-2xl">
            Where it&apos;s leaking
          </h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
            Three places solo businesses usually leave money behind. Tap any row
            to see the math behind that line.
          </p>
        </div>

        <ul className="space-y-2.5 sm:space-y-3">
          {result.leaks.map((leak, index) => (
            <LeakRow
              key={leak.name}
              leak={leak}
              mathLines={result.mathLines}
              maxAmount={maxLeak}
              index={index}
            />
          ))}
        </ul>
      </motion.div>

      {result.honeybook ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: APPLE_EASE, delay: 0.55 }}
          className="mt-4 overflow-hidden rounded-[16px] border border-foreground/8 bg-card shadow-[var(--shadow-card)] sm:rounded-[20px]"
        >
          <div className="surface-aurora px-5 py-4 text-white sm:px-6 sm:py-5 md:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/70 sm:text-[11px]">
              HoneyBook add-on
            </p>
            <p className="font-display mt-2 text-[1.5rem] font-semibold tracking-[-0.02em] sm:text-[1.75rem] md:text-[2rem]">
              ~{formatMoneyRounded(result.honeybook.total)}
              <span className="ml-1 text-base font-medium text-white/75 sm:text-lg">/yr</span>
            </p>
            <p className="mt-1 text-[13px] text-white/80 sm:text-sm">
              What your HoneyBook setup really costs
            </p>
          </div>
          <div className="divide-y divide-foreground/8 px-5 sm:px-6 md:px-8">
            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span className="min-w-0 text-[13px] leading-snug text-muted-foreground sm:text-[13.5px]">
                Subscription ({result.honeybook.tierName})
              </span>
              <span className="font-display shrink-0 text-base font-semibold text-[#00614A]">
                {formatMoney(result.honeybook.subscription)}/yr
              </span>
            </div>
            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span className="min-w-0 text-[13px] leading-snug text-muted-foreground sm:text-[13.5px]">
                Processing fees (2.9% + $0.30 on {result.honeybook.bookings} bookings)
              </span>
              <span className="font-display shrink-0 text-base font-semibold text-[#00614A]">
                ~{formatMoneyRounded(result.honeybook.fees)}/yr
              </span>
            </div>
            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span className="min-w-0 text-[13px] leading-snug text-muted-foreground sm:text-[13.5px]">
                Admin hours still done by hand
              </span>
              <span className="font-display shrink-0 text-base font-semibold text-[#00614A]">
                ~{formatMoneyRounded(result.honeybook.manualAdmin)}/yr
              </span>
            </div>
          </div>
          <p className="border-t border-foreground/8 px-5 py-4 text-[13px] leading-relaxed text-muted-foreground sm:px-6 md:px-8">
            Keep HoneyBook if the paperwork works for you. The first two lines are
            the price of the filing cabinet. The third is the cost of still doing
            the work yourself — and that is the line Salt takes off your plate.
          </p>
        </motion.div>
      ) : null}

      {rangeLine || benchmarkLine ? (
        <details className="group mt-5 rounded-2xl border border-foreground/8 bg-foreground/[0.02] px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4 md:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-[13px] font-semibold text-foreground/80 sm:text-[14px] [&::-webkit-details-marker]:hidden">
            About this estimate
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            {rangeLine ? (
              <li>
                <span className="font-semibold text-foreground">The range: </span>
                {rangeLine.detail}
              </li>
            ) : null}
            {benchmarkLine ? (
              <li>
                <span className="font-semibold text-foreground">Benchmarks: </span>
                {benchmarkLine.detail}
              </li>
            ) : null}
          </ul>
        </details>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: APPLE_EASE, delay: 0.65 }}
        className="surface-aurora relative mt-8 overflow-hidden rounded-[20px] px-5 py-8 text-center text-white shadow-[var(--shadow-lift)] sm:mt-10 sm:rounded-[24px] sm:px-8 sm:py-10 md:rounded-[28px] md:px-10 md:py-12"
      >
        <div className="relative z-10">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/75 sm:text-[10px] sm:tracking-[0.2em]">
            What Salt does next
          </p>
          <h2 className="font-display mt-3 text-balance text-xl font-semibold leading-[1.12] tracking-[-0.02em] sm:mt-4 sm:text-2xl md:text-[2.25rem] md:leading-[1.1]">
            This is the benchmark.
            <br className="hidden sm:inline" />
            <span className="sm:hidden"> </span>
            Salt shows you the{" "}
            <span className="font-semibold text-[#FFE566] underline decoration-[#F3A618] decoration-2 underline-offset-[4px] sm:underline-offset-[6px]">
              actual
            </span>{" "}
            number.
          </h2>
          <p className="mx-auto mt-3 max-w-lg px-1 text-sm leading-relaxed text-white/85 sm:mt-4 sm:px-0 sm:text-[15px]">
            Salt reads every tool your business runs on, surfaces what needs you,
            automates what doesn&apos;t, and shows you the money you&apos;re leaving
            on the table — then does the work. You approve.
          </p>

          <div className="mx-auto mt-6 max-w-md border-t border-white/15 pt-5 sm:mt-8 sm:pt-6">
            <p className="text-[13px] font-medium text-white/90 sm:text-sm">
              {alreadyOnWaitlist
                ? "You're already on the Salt waitlist."
                : "You're on the Salt waitlist — we'll be in touch."}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white/65">
              Built from industry benchmarks and your answers — not your actual
              books. Your real number could be lower. It could also be higher.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
