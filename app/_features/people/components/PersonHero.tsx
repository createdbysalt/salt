"use client";

import {
  ChevronDown,
  RefreshCw,
  Sparkles,
  StickyNote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import {
  memoryHeroInnerClass,
  memoryHeroSectionClass,
  memoryHeroSummaryClass,
  memoryHeroTitleClass,
} from "@/app/_features/memory/utils/memory-layout";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import { RecordStatusChip } from "@/app/_features/memory/components/RecordStatusControl";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import { getRelationshipLabel } from "@/app/_features/memory/taxonomy/registry";
import type { Connection, Person } from "@/app/_lib/demo/people-demo-data";
import { hasContactDate, relativeDays, formatMoney } from "@/app/_lib/demo/people-demo-data";

export type PersonQuickAction = "note" | "relationship" | "connection";

type PersonHeroProps = {
  person: Person;
  recordStatus?: Person["recordStatus"];
  relationship?: Person["relationship"];
  organization?: string;
  connections: Connection[];
  onLink: (connection: Connection) => void;
  onQuickAction?: (action: PersonQuickAction) => void;
};

export function PersonHero({
  person,
  recordStatus: recordStatusProp,
  relationship: relationshipProp,
  organization: organizationProp,
  connections,
  onLink,
  onQuickAction,
}: PersonHeroProps) {
  const recordStatus = recordStatusProp ?? person.recordStatus ?? "active";
  const relationship = relationshipProp ?? person.relationship;
  const organization = organizationProp ?? person.org?.name;

  const stats = [
    { label: "Active work", value: String(person.metrics.activeWork) },
    {
      label: "Outstanding",
      value: person.metrics.outstandingCents > 0 ? formatMoney(person.metrics.outstandingCents) : "—",
    },
    {
      label: "Next meeting",
      value: person.metrics.meetingWithinDays != null ? `${person.metrics.meetingWithinDays}d` : "—",
    },
    {
      label: "MRR",
      value: typeof person.mrrCents === "number" ? formatMoney(person.mrrCents) : "—",
    },
  ];

  return (
    <section className={memoryHeroSectionClass}>
      <div className={memoryHeroInnerClass}>
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-start">
          <div className="max-w-2xl min-w-0">
            <div className="flex items-center gap-2 mb-4 sm:mb-5 flex-wrap">
              <RecordStatusChip status={recordStatus} />
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                <span className="size-1.5 rounded-full bg-white animate-pulse-glow" />
                {person.lifecycle}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                {getRelationshipLabel(relationship)}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                {hasContactDate(person.lastContactAt)
                  ? `Last contact ${relativeDays(person.lastContactAt)}`
                  : "No contact yet"}
              </span>
            </div>

            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="size-14 sm:size-16 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-lg sm:text-xl font-semibold text-white shrink-0">
                {person.initials}
              </div>
              <div className="min-w-0">
                <h1 className={memoryHeroTitleClass}>
                  {person.name}
                </h1>
                {organization && <p className="mt-1.5 sm:mt-2 text-white/80 text-sm sm:text-base">{organization}</p>}
              </div>
            </div>

            <p className={memoryHeroSummaryClass}>{person.summary}</p>

            <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openAskSalt({
                    context: {
                      type: "person",
                      id: person.id,
                      name: person.name,
                      relationship,
                      orgName: organization,
                      lifecycle: person.lifecycle,
                      href: `/people/${person.id}`,
                    },
                  })
                }
                title="Ask Salt about this person"
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white pl-4 pr-5 text-sm font-semibold text-neutral-900 transition hover-lift"
              >
                <Sparkles className="size-4 shrink-0 text-flame" strokeWidth={2.25} />
                Ask Salt
              </button>

              <RadixAfterHydration
                fallback={
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur"
                  >
                    Quick action
                    <ChevronDown className="size-3.5" strokeWidth={2} />
                  </button>
                }
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
                    >
                      Quick action
                      <ChevronDown className="size-3.5" strokeWidth={2} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={() => onQuickAction?.("note")} className="gap-2">
                      <StickyNote className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      Add note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onQuickAction?.("relationship")} className="gap-2">
                      <RefreshCw className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      Change relationship
                    </DropdownMenuItem>
                    <MemoryCreateLinkButton
                      recordKind="person"
                      recordId={person.id}
                      recordName={person.name}
                      existingConnections={connections}
                      onLink={onLink}
                      variant="dropdown"
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </RadixAfterHydration>
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
                <p className="mt-1 font-display text-2xl leading-none tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -top-10 -right-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />
    </section>
  );
}
