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
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-start">
          <div className="max-w-2xl min-w-0">
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

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:w-[200px]">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/12 backdrop-blur border border-white/20 p-3.5"
                style={{
                  animation: `rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`,
                  animationDelay: `${i * 80 + 100}ms`,
                }}
              >
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">{s.label}</p>
                <p className="mt-1 font-display text-2xl leading-none tabular-nums truncate">{s.value}</p>
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
