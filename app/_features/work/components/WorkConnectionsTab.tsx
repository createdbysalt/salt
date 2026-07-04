"use client";

import Link from "next/link";
import { Briefcase, Building2, User, Users } from "lucide-react";
import { cn } from "@repo/utils";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

type LinkedItem = {
  id: string;
  title: string;
  subtitle?: string;
  tone?: "default" | "good" | "watch" | "risk";
  work?: { status: string; progress: number };
};

type LinkedGroup = {
  key: "people" | "orgs" | "work";
  label: string;
  icon: typeof Building2;
  items: LinkedItem[];
};

const TONE_DOT: Record<NonNullable<LinkedItem["tone"]>, string> = {
  default: "bg-muted-foreground/40",
  good: "bg-emerald-500",
  watch: "bg-flame",
  risk: "bg-destructive",
};

function buildGroups(work: WorkDetailViewModel, connections: Connection[]): LinkedGroup[] {
  const people: LinkedItem[] = connections
    .filter((connection) => connection.type === "person")
    .map((connection) => ({
      id: connection.id,
      title: connection.name,
      subtitle: connection.subtitle,
    }));

  const orgMap = new Map<string, LinkedItem>();
  if (work.org) {
    orgMap.set(work.org.id, {
      id: work.org.id,
      title: work.org.name,
      subtitle: "Client organization",
    });
  }
  connections
    .filter((connection) => connection.type === "org")
    .forEach((connection) => {
      if (!orgMap.has(connection.id)) {
        orgMap.set(connection.id, {
          id: connection.id,
          title: connection.name,
          subtitle: connection.subtitle,
        });
      }
    });

  const relatedWork: LinkedItem[] = connections
    .filter((connection) => connection.type === "work" && connection.id !== work.id)
    .map((connection) => ({
      id: connection.id,
      title: connection.name,
      subtitle: connection.subtitle,
    }));

  const groups: LinkedGroup[] = [
    { key: "people", label: "People", icon: User, items: people },
    { key: "orgs", label: "Organizations", icon: Building2, items: Array.from(orgMap.values()) },
    { key: "work", label: "Related work", icon: Briefcase, items: relatedWork },
  ];

  return groups.filter((group) => group.items.length > 0);
}

type WorkConnectionsTabProps = {
  work: WorkDetailViewModel;
  connections: Connection[];
  onLink: (connection: Connection) => void;
};

function ConnectionCard({ item, href }: { item: LinkedItem; href: string }) {
  const inner = item.work ? (
    <div className="h-full rounded-2xl border border-border/60 bg-card p-4 transition hover:bg-card/80">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
          {item.work.status}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="surface-aurora h-full" style={{ width: `${item.work.progress}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
        {item.work.progress}% complete
      </p>
    </div>
  ) : (
    <div className="flex h-full items-start gap-3 rounded-2xl border border-border/60 bg-card p-3.5 transition hover:bg-card/80">
      <span
        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[item.tone ?? "default"])}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {item.subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

export function WorkConnectionsTab({ work, connections, onLink }: WorkConnectionsTabProps) {
  const groups = buildGroups(work, connections);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl tracking-tight text-foreground">
            Connections
          </h2>
          <MemoryCreateLinkButton
            variant="panel"
            recordKind="work"
            recordId={work.id}
            recordName={work.title}
            existingConnections={connections}
            onLink={onLink}
          />
        </header>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Users className="mx-auto mb-2 size-6 text-muted-foreground" strokeWidth={1.75} />
            <p className="text-sm text-muted-foreground">
              Nothing in memory is connected to this work yet.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground/80">
              Link people, organizations, or related work so Salt can see the full context.
            </p>
          </div>
        ) : null}
      </section>

      {groups.map((group) => {
          const Icon = group.icon;
          const hrefFor = (item: LinkedItem) => {
            if (group.key === "people") return `/people/${item.id}`;
            if (group.key === "orgs") return `/orgs/${item.id}`;
            return `/work/${item.id}`;
          };

          return (
            <section key={group.key} className="space-y-3">
              <header className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </h3>
                <span className="text-[10px] tabular-nums text-muted-foreground/70">
                  {group.items.length}
                </span>
              </header>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <ConnectionCard key={item.id} item={item} href={hrefFor(item)} />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
