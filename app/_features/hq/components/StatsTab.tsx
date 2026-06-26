"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Flame,
  Sparkles,
  ArrowUpRight,
  Clock,
  CreditCard,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { HqStatsData } from "@/app/_features/hq/types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return formatCurrency(amount);
}

function buildSparkPath(spark: number[]) {
  const w = 100;
  const h = 32;
  if (spark.length === 0) return { line: "", area: "" };
  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const pts = spark.map((v, i) => {
    const x = (i / Math.max(spark.length - 1, 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return [x, y] as const;
  });
  return {
    line: pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" "),
    area:
      pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ") +
      ` L ${w} ${h} L 0 ${h} Z`,
  };
}

function CardEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

type Props = {
  data: HqStatsData;
};

export function StatsTab({ data }: Props) {
  const { revenue, outstanding, topClients, clientPulse, pipeline } = data;
  const sparkPath = buildSparkPath(revenue?.sparkline ?? []);
  const revenueDelta =
    revenue && revenue.priorMonthCollected && revenue.priorMonthCollected > 0
      ? Math.round(
          ((revenue.mtdCollected - revenue.priorMonthCollected) / revenue.priorMonthCollected) * 100,
        )
      : null;
  const updatedLabel = revenue
    ? `Your pulse for ${revenue.monthLabel} · updated just now`
    : "Your pulse updates as billing and client activity come in";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-5"
    >
      <header className="flex items-end justify-between gap-4 px-1 pt-1">
        <div className="min-w-0">
          <h2 className="font-display text-4xl leading-[0.95] tracking-tight lg:text-5xl">
            How the business is moving
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{updatedLabel}</p>
        </div>
        <span className="chip hidden shrink-0 sm:inline-flex">
          <Sparkles className="size-3 text-flame" strokeWidth={2.5} />{" "}
          {revenue?.monthLabel ?? "This month"}
        </span>
      </header>

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: APPLE_EASE }}
          className="surface-aurora relative col-span-12 overflow-hidden rounded-3xl p-6 text-white lg:col-span-8 lg:p-8"
        >
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <span className="chip bg-white/15 text-white/90 backdrop-blur">
                <TrendingUp className="size-3" /> Revenue MTD
              </span>
              {revenueDelta !== null ? (
                <span className="chip bg-white/15 text-white/90 backdrop-blur">
                  {revenueDelta >= 0 ? "+" : ""}
                  {revenueDelta}% vs last month
                </span>
              ) : null}
            </div>
            {revenue && revenue.mtdCollected > 0 ? (
              <>
                <div className="flex flex-wrap items-end gap-6">
                  <p className="font-display text-6xl tabular-nums leading-none tracking-tight lg:text-7xl">
                    {formatCurrency(revenue.mtdCollected)}
                  </p>
                  {revenue.goalAmount ? (
                    <div className="pb-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">
                        Goal {formatCompactCurrency(revenue.goalAmount)}
                      </p>
                      <p className="mt-1 font-display text-2xl tabular-nums leading-none">
                        {Math.round((revenue.mtdCollected / revenue.goalAmount) * 100)}%
                      </p>
                    </div>
                  ) : null}
                </div>
                {sparkPath.line ? (
                  <div className="mt-6">
                    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-14 w-full">
                      <defs>
                        <linearGradient id="hsparkFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <motion.path
                        d={sparkPath.area}
                        fill="url(#hsparkFill)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                      />
                      <motion.path
                        d={sparkPath.line}
                        fill="none"
                        stroke="white"
                        strokeWidth="0.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.1, ease: APPLE_EASE, delay: 0.25 }}
                      />
                    </svg>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-2">
                <p className="font-display text-5xl tabular-nums leading-none tracking-tight">$0</p>
                <p className="mt-3 max-w-md text-sm text-white/85">
                  Paid invoices this month will show up here once billing is connected.
                </p>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute -top-12 -right-12 size-64 animate-float rounded-full bg-white/20 blur-3xl" />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 size-56 animate-float rounded-full bg-flame/40 blur-3xl"
            style={{ animationDelay: "-3s" }}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04, ease: APPLE_EASE }}
          className="glass-card col-span-6 flex flex-col rounded-3xl p-6 lg:col-span-4"
        >
          <header className="mb-2 flex items-center justify-between">
            <span className="chip">Utilization</span>
          </header>
          <CardEmpty message="Time tracking isn't connected yet. Billable hours will land here when it is." />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: APPLE_EASE }}
          className="glass-card col-span-12 rounded-3xl p-6 sm:col-span-6"
        >
          <header className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="size-[18px]" strokeWidth={1.75} />
              <span className="chip">Pipeline</span>
            </div>
          </header>
          {pipeline && pipeline.count > 0 ? (
            <>
              <p className="font-display text-5xl tabular-nums leading-none tracking-tight">
                {formatCompactCurrency(pipeline.total)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pipeline.count} active proposal{pipeline.count === 1 ? "" : "s"}
              </p>
              <ul className="mt-4 space-y-2">
                {pipeline.items.map((item) => (
                  <li key={item.name} className="flex items-center justify-between text-[12px]">
                    <span className="truncate">{item.name}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {item.stage}
                      </span>
                      <span className="font-medium tabular-nums">{formatCompactCurrency(item.value)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <CardEmpty message="Send proposals to see pipeline value here." />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: APPLE_EASE }}
          className="glass-card col-span-12 rounded-3xl p-6 sm:col-span-6"
        >
          <header className="mb-3 flex items-center gap-2">
            <CreditCard className="size-[18px]" strokeWidth={1.75} />
            <span className="chip">Outstanding</span>
          </header>
          {outstanding && outstanding.total > 0 ? (
            <>
              <p className="font-display text-5xl tabular-nums leading-none tracking-tight">
                {formatCompactCurrency(outstanding.total)}
              </p>
              {outstanding.overdueCount > 0 ? (
                <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                  <Flame className="size-3 text-flame" strokeWidth={2.5} />
                  <span className="font-medium text-flame">
                    {outstanding.overdueCount} invoice{outstanding.overdueCount === 1 ? "" : "s"}
                    {outstanding.overdueDays !== null ? ` ${outstanding.overdueDays} days overdue` : " overdue"}
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted-foreground">All invoices on time</p>
              )}
              {outstanding.topOverdue ? (
                <Link
                  href={outstanding.topOverdue.href}
                  className="group mt-4 block w-full rounded-xl bg-muted/60 p-3 transition hover:bg-muted"
                >
                  <p className="text-sm font-medium">
                    {outstanding.topOverdue.clientName} · {formatCurrency(outstanding.topOverdue.amount)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" /> Review in billing{" "}
                    <ArrowUpRight className="ml-auto size-3 transition group-hover:translate-x-0.5" />
                  </p>
                </Link>
              ) : null}
            </>
          ) : (
            <CardEmpty message="No outstanding invoices. You're caught up." />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: APPLE_EASE }}
          className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-7"
        >
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">This week&apos;s hours</h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-flame" /> Client
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-sky" /> Internal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-violet" /> Admin
              </span>
            </div>
          </header>
          <CardEmpty message="Weekly hours will appear when time tracking is connected." />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: APPLE_EASE }}
          className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-5"
        >
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">Top clients</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">{revenue?.monthLabel ?? "MTD"}</span>
          </header>
          {topClients.length > 0 ? (
            <ul className="space-y-3">
              {topClients.map((client, index) => (
                <li key={client.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-md border border-border/60 bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate font-medium">{client.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatCompactCurrency(client.value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${client.share}%` }}
                      transition={{ duration: 1, delay: 0.25 + index * 0.05, ease: APPLE_EASE }}
                      className="h-full rounded-full"
                      style={{ backgroundImage: "var(--gradient-aurora)" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <CardEmpty message="Client revenue ranks here once invoices are paid this month." />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24, ease: APPLE_EASE }}
          className="col-span-12 flex flex-col items-start gap-5 rounded-3xl border border-border/50 bg-[color-mix(in_oklab,var(--muted)_70%,transparent)] p-6 sm:flex-row sm:items-center lg:p-7"
        >
          {clientPulse ? (
            <>
              <div className="flex shrink-0 -space-x-2">
                {Array.from({ length: clientPulse.healthy }).map((_, index) => (
                  <span
                    key={`h${index}`}
                    className="size-7 rounded-full bg-[oklch(0.65_0.18_145)] ring-2 ring-background"
                  />
                ))}
                {Array.from({ length: clientPulse.watch }).map((_, index) => (
                  <span
                    key={`w${index}`}
                    className="size-7 rounded-full bg-[oklch(0.78_0.16_75)] ring-2 ring-background"
                  />
                ))}
                {Array.from({ length: clientPulse.atRisk }).map((_, index) => (
                  <span
                    key={`r${index}`}
                    className="size-7 rounded-full bg-[oklch(0.6_0.22_28)] ring-2 ring-background"
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Client pulse
                </p>
                <p className="mt-1 font-display text-xl leading-tight tracking-tight sm:text-2xl">
                  {clientPulse.totalActive} active organization{clientPulse.totalActive === 1 ? "" : "s"}.
                  {clientPulse.needsReview ? (
                    <span className="text-muted-foreground italic">
                      {" "}
                      {clientPulse.atRisk === 1 ? "One requires" : `${clientPulse.atRisk} require`} immediate review.
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic"> Relationships look steady.</span>
                  )}
                </p>
                <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{clientPulse.healthy}</span> healthy
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{clientPulse.watch}</span> needs attention
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{clientPulse.atRisk}</span> at risk
                  </span>
                </div>
              </div>
              <Link
                href="/orgs"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                View orgs <ArrowUpRight className="size-4" strokeWidth={2.25} />
              </Link>
            </>
          ) : (
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Client pulse
                </p>
                <p className="mt-1 font-display text-xl tracking-tight sm:text-2xl">
                  Org health appears as relationships grow
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Link organizations, contacts, and billing activity so Salt can score account health.
                </p>
              </div>
              <Link
                href="/orgs"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                View orgs <ArrowUpRight className="size-4" strokeWidth={2.25} />
              </Link>
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
