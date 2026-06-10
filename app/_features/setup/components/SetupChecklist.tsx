"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@repo/utils";
import { AppBrandIcon } from "@/app/_features/onboarding/components/AppBrandIcon";
import {
  SETUP_SECTIONS,
  type SetupItem,
  type SetupSection,
} from "@/app/_features/setup/setup-data";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

function sectionProgress(section: SetupSection) {
  const done = section.items.filter((item) => item.done).length;
  return { done, total: section.items.length, ratio: done / section.items.length };
}

function sectionStatus(section: SetupSection): "complete" | "active" | "upcoming" {
  const { done, total } = sectionProgress(section);
  if (done === total) return "complete";
  if (done > 0) return "active";
  return "upcoming";
}

export function SetupChecklist() {
  const allItems = useMemo(() => SETUP_SECTIONS.flatMap((s) => s.items), []);
  const completed = allItems.filter((i) => i.done).length;
  const total = allItems.length;
  const pct = Math.round((completed / total) * 100);

  const nextItem = useMemo(
    () => allItems.find((item) => !item.done) ?? null,
    [allItems],
  );

  const minutesLeft = useMemo(
    () =>
      allItems
        .filter((item) => !item.done)
        .reduce((sum, item) => sum + (item.minutes ?? 2), 0),
    [allItems],
  );

  const connectedIcons = useMemo(
    () => allItems.filter((item) => item.done && item.icon.kind === "brand").slice(0, 4),
    [allItems],
  );

  const activeSectionId = useMemo(() => {
    const firstIncomplete = SETUP_SECTIONS.find((s) => s.items.some((i) => !i.done));
    return firstIncomplete?.id ?? SETUP_SECTIONS[SETUP_SECTIONS.length - 1].id;
  }, []);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SETUP_SECTIONS.map((section) => [section.id, section.id === activeSectionId]),
    ),
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <RoadmapHeader
        completed={completed}
        total={total}
        pct={pct}
        minutesLeft={minutesLeft}
        connectedIcons={connectedIcons}
      />

      <div className="space-y-3">
        {SETUP_SECTIONS.map((section) => {
          const status = sectionStatus(section);
          const { done, total: sectionTotal } = sectionProgress(section);
          const isOpen = openSections[section.id] ?? false;
          const isActiveSection = section.id === activeSectionId;

          return (
            <section
              key={section.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card transition-shadow",
                isOpen ? "border-border/80 shadow-[var(--shadow-card)]" : "border-border/60",
              )}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/20"
              >
                <h2 className="flex-1 text-[15px] font-semibold tracking-tight">{section.label}</h2>

                <div className="flex shrink-0 items-center gap-3">
                  <SectionStatusIcon status={status} progress={done / sectionTotal} />
                  <span className="whitespace-nowrap tabular-nums text-[12px] text-muted-foreground">
                    {sectionTotal} {sectionTotal === 1 ? "task" : "tasks"}
                  </span>
                  {isOpen ? (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: APPLE_EASE }}
                    className="border-t border-border/50 px-5 py-2"
                  >
                    {section.items.map((item) => (
                      <TaskRow
                        key={item.id}
                        item={item}
                        isInProgress={item.id === nextItem?.id}
                        isActiveSection={isActiveSection}
                      />
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function RoadmapHeader({
  completed,
  total,
  pct,
  minutesLeft,
  connectedIcons,
}: {
  completed: number;
  total: number;
  pct: number;
  minutesLeft: number;
  connectedIcons: SetupItem[];
}) {
  const remaining = total - completed;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-foreground shadow-[var(--shadow-card)]">
          <span
            aria-hidden
            className="block h-5 w-8 bg-background"
            style={{
              maskImage: "url(/salt-logo.svg)",
              WebkitMaskImage: "url(/salt-logo.svg)",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl leading-tight tracking-tight sm:text-[28px]">
            Finish setting up Salt
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Salt workspace · Onboarding checklist</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: APPLE_EASE }}
            className="h-full rounded-full surface-aurora"
          />
        </div>
        <span className="shrink-0 tabular-nums text-[13px] font-semibold">{pct}% complete</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            {connectedIcons.map((item) => (
              <span
                key={item.id}
                className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted"
              >
                {item.icon.kind === "brand" && (
                  <AppBrandIcon brand={item.icon.brand} className="size-4" />
                )}
              </span>
            ))}
            {remaining > 0 && (
              <span className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-[11px] font-semibold text-muted-foreground">
                +{remaining}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" strokeWidth={2} />
            Started today
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Target className="size-3.5" strokeWidth={2} />
            {remaining > 0 ? `~${minutesLeft} min left` : "All done"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionStatusIcon({
  status,
  progress,
}: {
  status: "complete" | "active" | "upcoming";
  progress: number;
}) {
  if (status === "complete") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-flame text-background">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }

  if (status === "upcoming") {
    return (
      <span
        className="size-7 shrink-0 rounded-full border-2 border-dashed border-border"
        aria-hidden
      />
    );
  }

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      className="-rotate-90 shrink-0"
      aria-hidden
    >
      <circle
        cx={14}
        cy={14}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        className="text-muted"
      />
      <circle
        cx={14}
        cy={14}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        className="text-flame"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function TaskRow({
  item,
  isInProgress,
  isActiveSection,
}: {
  item: SetupItem;
  isInProgress: boolean;
  isActiveSection: boolean;
}) {
  const content = (
    <>
      <TaskCheckbox done={item.done} />

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "text-[14px] leading-snug",
            item.done ? "text-muted-foreground" : "font-medium text-foreground",
          )}
        >
          {item.title}
        </span>
        {isInProgress && isActiveSection && !item.done && (
          <span className="inline-flex h-6 items-center rounded-full border border-sky/30 bg-sky/15 px-2.5 text-[11px] font-semibold text-sky">
            In progress
          </span>
        )}
      </div>

      <div className="shrink-0">
        {item.done ? (
          <TaskIconBadge item={item} />
        ) : item.href ? (
          <Link
            href={item.href}
            className="grid size-8 place-items-center rounded-full border border-border/70 bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={item.cta ?? "Open"}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
          </Link>
        ) : (
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full border border-border/70 bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={item.cta ?? "Connect"}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </>
  );

  const rowClass = cn(
    "flex items-center gap-3.5 border-b border-border/40 py-3.5 last:border-0",
    !item.done && "-mx-2 rounded-xl px-2 transition-colors hover:bg-muted/20",
  );

  if (item.href && !item.done) {
    return (
      <li>
        <Link href={item.href} className={rowClass}>
          {content}
        </Link>
      </li>
    );
  }

  return <li className={rowClass}>{content}</li>;
}

function TaskCheckbox({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[5px] transition-colors",
        done ? "bg-flame text-background" : "border-2 border-border/80 bg-card",
      )}
      aria-hidden
    >
      {done && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

function TaskIconBadge({ item }: { item: SetupItem }) {
  return (
    <span className="grid size-8 place-items-center rounded-full border border-border/50 bg-muted">
      <SetupItemIcon item={item} size="sm" />
    </span>
  );
}

function SetupItemIcon({
  item,
  size = "sm",
}: {
  item: SetupItem;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "size-4" : "size-5";

  if (item.icon.kind === "brand") {
    return <AppBrandIcon brand={item.icon.brand} className={iconSize} />;
  }

  const Icon = item.icon.icon;
  return <Icon className={cn(iconSize, "text-foreground")} strokeWidth={1.9} />;
}
