"use client";

"use client";

import { toast } from "sonner";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import { RecordStatusChip } from "@/app/_features/memory/components/RecordStatusControl";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { relativeDays, formatMoney } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection, RecordStatus, RelationshipType } from "@/app/_lib/demo/people-demo-data";

type OrgHeroProps = {
  org: Org;
  recordStatus?: RecordStatus;
  relationship?: RelationshipType;
  keyContactName?: string;
  connections: Connection[];
  onLink: (connection: Connection) => void;
};

export function OrgHero({
  org,
  recordStatus: recordStatusProp,
  relationship: relationshipProp,
  keyContactName: keyContactNameProp,
  connections,
  onLink,
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
    <section className="relative overflow-hidden rounded-[28px] surface-aurora text-white animate-rise">
      <div className="relative z-10 p-7 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <RecordStatusChip status={recordStatus} />
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                <span className="size-1.5 rounded-full bg-white animate-pulse-glow" />
                {org.lifecycle}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                {relationship}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                Last contact {relativeDays(org.lastContactAt)}
              </span>
            </div>

            <div className="flex items-center gap-5">
              <div className="size-16 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-xl font-semibold text-white shrink-0">
                {org.initials}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-5xl lg:text-[58px] leading-[0.95] tracking-tight">
                  {org.name}
                </h1>
                <p className="mt-2 text-white/80 text-base">
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

            <p className="mt-5 text-white/85 text-lg leading-snug">{org.summary}</p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <SaltActionButton
                variant="hero"
                onClick={() => toast.success(`Draft started for ${keyContactName ?? "key contact"}`)}
                title="Salt will draft this message for you"
              >
                Message key contact
              </SaltActionButton>
              <MemoryCreateLinkButton
                recordKind="org"
                recordId={org.id}
                recordName={org.name}
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
