"use client";

import Link from "next/link";
import { Briefcase, Building2, User, Users } from "lucide-react";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import { linkedPeopleForOrg } from "@/app/_features/memory/components/linkableMemory";
import { cn } from "@repo/utils";

type LinkedItem = {
  id: string;
  title: string;
  subtitle?: string;
  tone?: "default" | "good" | "watch" | "risk";
  work?: { status: string; progress: number };
};

type LinkedGroup = {
  key: string;
  label: string;
  icon: typeof Building2;
  items: LinkedItem[];
};

const WORK_TONE: Record<string, LinkedItem["tone"]> = {
  Active: "good",
  Renewing: "watch",
  Stalled: "risk",
  Wrapping: "default",
};

const TONE_DOT: Record<NonNullable<LinkedItem["tone"]>, string> = {
  default: "bg-muted-foreground/40",
  good: "bg-emerald-500",
  watch: "bg-flame",
  risk: "bg-destructive",
};

function buildGroups(org: Org, connections: Connection[]): LinkedGroup[] {
  const people: LinkedItem[] = linkedPeopleForOrg(org.id, connections).map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: p.role ?? p.relationship,
    tone: p.metrics.health === "good" ? "good" : p.metrics.health === "watch" ? "watch" : "risk",
  }));

  const workMap = new Map<string, LinkedItem>();
  org.work.forEach((w) => {
    workMap.set(w.id, {
      id: w.id,
      title: w.title,
      tone: WORK_TONE[w.status] ?? "default",
      work: { status: w.status, progress: w.progress },
    });
  });
  [...connections]
    .filter((c) => c.type === "work")
    .forEach((c) => {
      if (!workMap.has(c.id)) {
        workMap.set(c.id, { id: c.id, title: c.name, subtitle: c.subtitle });
      }
    });
  const work = Array.from(workMap.values());

  const partnerOrgMap = new Map<string, LinkedItem>();
  connections
    .filter((c) => c.type === "org")
    .forEach((c) => {
      if (!partnerOrgMap.has(c.id)) {
        partnerOrgMap.set(c.id, { id: c.id, title: c.name, subtitle: c.subtitle });
      }
    });
  const partnerOrgs = Array.from(partnerOrgMap.values());

  const groups: LinkedGroup[] = [
    { key: "people", label: "People", icon: User, items: people },
    { key: "work", label: "Work", icon: Briefcase, items: work },
    { key: "orgs", label: "Organizations", icon: Building2, items: partnerOrgs },
  ];

  return groups.filter((g) => g.items.length > 0);
}

export function OrgConnectionsTab({
  org,
  connections,
}: {
  org: Org;
  connections: Connection[];
}) {
  const groups = buildGroups(org, connections);

  return (
    <div className="space-y-6">
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Users className="size-6 mx-auto text-muted-foreground mb-2" strokeWidth={1.75} />
          <p className="text-sm text-muted-foreground">Nothing in memory is connected to this org yet.</p>
        </div>
      ) : (
        groups.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.key} className="space-y-3">
              <header className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                  {group.label}
                </h3>
                <span className="text-[10px] tabular-nums text-muted-foreground/70">{group.items.length}</span>
              </header>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {group.items.map((item) => {
                  const inner = item.work ? (
                    <div className="rounded-2xl border border-border/60 bg-card hover:bg-card/80 transition p-4 h-full">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">{item.work.status}</span>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full surface-aurora" style={{ width: `${item.work.progress}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">{item.work.progress}% complete</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/60 bg-card hover:bg-card/80 transition p-3.5 flex items-start gap-3 h-full">
                      <span className={cn("mt-1.5 size-1.5 rounded-full shrink-0", TONE_DOT[item.tone ?? "default"])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                  );

                  if (group.key === "people") {
                    return (
                      <Link key={item.id} href={`/people/${item.id}`} className="block">
                        {inner}
                      </Link>
                    );
                  }
                  if (group.key === "orgs") {
                    return (
                      <Link key={item.id} href={`/orgs/${item.id}`} className="block">
                        {inner}
                      </Link>
                    );
                  }
                  if (group.key === "work") {
                    return (
                      <Link key={item.id} href={`/work/${item.id}`} className="block">
                        {inner}
                      </Link>
                    );
                  }
                  return <div key={item.id}>{inner}</div>;
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
