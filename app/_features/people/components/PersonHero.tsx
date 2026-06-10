"use client";

import { toast } from "sonner";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import { RecordStatusChip } from "@/app/_features/memory/components/RecordStatusControl";
import type { Connection, Person } from "@/app/_lib/demo/people-demo-data";
import { relativeDays, formatMoney } from "@/app/_lib/demo/people-demo-data";

type PersonHeroProps = {
  person: Person;
  recordStatus?: Person["recordStatus"];
  relationship?: Person["relationship"];
  organization?: string;
  connections: Connection[];
  onLink: (connection: Connection) => void;
};

export function PersonHero({
  person,
  recordStatus: recordStatusProp,
  relationship: relationshipProp,
  organization: organizationProp,
  connections,
  onLink,
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
    <section className="relative overflow-hidden rounded-[28px] surface-aurora text-white animate-rise">
      <div className="relative z-10 p-7 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <RecordStatusChip status={recordStatus} />
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                <span className="size-1.5 rounded-full bg-white animate-pulse-glow" />
                {person.lifecycle}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                {relationship}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                Last contact {relativeDays(person.lastContactAt)}
              </span>
            </div>

            <div className="flex items-center gap-5">
              <div className="size-16 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-xl font-semibold text-white shrink-0">
                {person.initials}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-5xl lg:text-[58px] leading-[0.95] tracking-tight">
                  {person.name}
                </h1>
                {organization && <p className="mt-2 text-white/80 text-base">{organization}</p>}
              </div>
            </div>

            <p className="mt-5 text-white/85 text-lg leading-snug">{person.summary}</p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <SaltActionButton
                variant="hero"
                onClick={() => toast.success("Draft started in Convos")}
                title="Salt will draft this message for you"
              >
                Draft message
              </SaltActionButton>
              <MemoryCreateLinkButton
                recordKind="person"
                recordId={person.id}
                recordName={person.name}
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
