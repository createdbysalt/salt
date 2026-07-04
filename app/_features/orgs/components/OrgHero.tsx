"use client";

import {
  ChevronDown,
  Sparkles,
  StickyNote,
  UserPlus,
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
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { hasContactDate, relativeDays, formatMoney } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection, RecordStatus, RelationshipType } from "@/app/_lib/demo/people-demo-data";

export type OrgQuickAction = "note" | "contact" | "connection";

type OrgHeroProps = {
  org: Org;
  recordStatus?: RecordStatus;
  relationship?: RelationshipType;
  keyContactName?: string;
  connections: Connection[];
  onLink: (connection: Connection) => void;
  onQuickAction?: (action: OrgQuickAction) => void;
};

export function OrgHero({
  org,
  recordStatus: recordStatusProp,
  relationship: relationshipProp,
  keyContactName: keyContactNameProp,
  connections,
  onLink,
  onQuickAction,
}: OrgHeroProps) {
  const recordStatus = recordStatusProp ?? org.recordStatus ?? "active";
  const relationship = relationshipProp ?? org.relationship;
  const keyContactName = keyContactNameProp ?? org.keyContact?.name;

  const stats = [
    { label: "Active work", value: String(org.metrics.activeWork) },
    {
      label: "Outstanding",
      value: org.metrics.outstandingCents > 0 ? formatMoney(org.metrics.outstandingCents) : "—",
    },
    { label: "Contacts", value: String(org.contactCount) },
    {
      label: "MRR",
      value: typeof org.mrrCents === "number" ? formatMoney(org.mrrCents) : org.revenueBand ?? "—",
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
                {org.lifecycle}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                {getRelationshipLabel(relationship)}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                {hasContactDate(org.lastContactAt)
                  ? `Last contact ${relativeDays(org.lastContactAt)}`
                  : "No contact yet"}
              </span>
            </div>

            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="size-14 sm:size-16 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-lg sm:text-xl font-semibold text-white shrink-0">
                {org.initials}
              </div>
              <div className="min-w-0">
                <h1 className={memoryHeroTitleClass}>
                  {org.name}
                </h1>
                <p className="mt-1.5 sm:mt-2 text-white/80 text-sm sm:text-base break-words">
                  {org.industry && <span className="text-white font-medium">{org.industry}</span>}
                  {org.website && (
                    <>
                      <span className="mx-1.5 text-white/40">/</span>
                      <span>{org.website}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <p className={memoryHeroSummaryClass}>{org.summary}</p>

            <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openAskSalt({
                    context: {
                      type: "org",
                      id: org.id,
                      name: org.name,
                      relationship,
                      lifecycle: org.lifecycle,
                      industry: org.industry,
                      href: `/orgs/${org.id}`,
                    },
                  })
                }
                title="Ask Salt about this org"
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
                    <DropdownMenuItem onClick={() => onQuickAction?.("contact")} className="gap-2">
                      <UserPlus className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      Add contact
                    </DropdownMenuItem>
                    <MemoryCreateLinkButton
                      recordKind="org"
                      recordId={org.id}
                      recordName={org.name}
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
                style={{ animation: `rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`, animationDelay: `${i * 80 + 100}ms` }}
              >
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">{s.label}</p>
                <p className="mt-1 font-display text-2xl leading-none tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -top-10 -right-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
    </section>
  );
}
