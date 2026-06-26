"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import {
  memoryHeroInnerClass,
  memoryHeroSectionClass,
  memoryHeroSummaryClass,
  memoryHeroTitleClass,
} from "@/app/_features/memory/utils/memory-layout";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import { relativeDays } from "@/app/_features/work/data";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

const STATUS_TONE: Record<WorkDetailViewModel["status"], string> = {
  Active: "bg-white/15 text-white/90 backdrop-blur border-white/20",
  Renewing: "bg-white/15 text-white/90 backdrop-blur border-white/20",
  Stalled: "bg-destructive/20 text-white border-white/20",
  Wrapping: "bg-white/10 text-white/80 backdrop-blur border-white/20",
};

type WorkHeroProps = {
  work: WorkDetailViewModel;
  connections: Connection[];
  onLink: (connection: Connection) => void;
};

export function WorkHero({ work, connections, onLink }: WorkHeroProps) {
  const stats = [
    { label: "Progress", value: `${work.progress}%` },
    { label: "Contacts", value: String(work.contactCount) },
    { label: "Last activity", value: relativeDays(work.lastActivityAt) },
    { label: "Organization", value: work.org?.name ?? "—" },
  ];

  return (
    <section className={memoryHeroSectionClass}>
      <div className={memoryHeroInnerClass}>
        <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
              <span
                className={cn(
                  "chip border",
                  STATUS_TONE[work.status],
                )}
              >
                <span className="size-1.5 rounded-full bg-white animate-pulse-glow" />
                {work.status}
              </span>
              <span className="chip border border-white/20 bg-white/15 text-white/90 backdrop-blur">
                {work.progress}% complete
              </span>
              <span className="chip border border-white/20 bg-white/15 text-white/90 backdrop-blur">
                Last activity {relativeDays(work.lastActivityAt)}
              </span>
              {work.projectType ? (
                <span className="chip border border-white/20 bg-white/15 text-white/90 backdrop-blur">
                  {work.projectType}
                </span>
              ) : null}
            </div>

            <div className="flex items-start gap-4 sm:items-center sm:gap-5">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 text-white backdrop-blur sm:size-16">
                <Briefcase className="size-6 sm:size-7" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <h1 className={memoryHeroTitleClass}>{work.title}</h1>
                {work.org ? (
                  <p className="mt-1.5 text-sm text-white/80 sm:mt-2 sm:text-base">
                    For{" "}
                    <Link
                      href={`/orgs/${work.org.id}`}
                      className="font-medium text-white underline-offset-4 hover:underline"
                    >
                      {work.org.name}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/15 sm:mt-5">
              <div className="h-full bg-white/90" style={{ width: `${work.progress}%` }} />
            </div>

            <p className={memoryHeroSummaryClass}>{work.summary}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7">
              <SaltActionButton
                variant="hero"
                onClick={() => toast.success(`Draft started for ${work.title}`)}
                title="Salt will draft this status update for you"
              >
                Draft status update
              </SaltActionButton>
              <MemoryCreateLinkButton
                recordKind="work"
                recordId={work.id}
                recordName={work.title}
                existingConnections={connections}
                onLink={onLink}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:min-w-[280px]">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur sm:px-4 sm:py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/60">{stat.label}</p>
                <p className="mt-1 truncate text-sm font-medium text-white sm:text-base">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />
    </section>
  );
}
